import {
  Controller,
  Post,
  UseGuards,
  Req, // Retained for future utility with disabled lint rule
  Body,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  HttpCode,
  HttpStatus,
  HttpException,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { Role } from "shared/types/role.enum";
import { FileInterceptor } from "@nestjs/platform-express";
import axios from "axios";
import FormData from "form-data";
import { Request } from "express";

// NOTE: The AI Agent microservice runs locally on port 8001
const AI_AGENT_URL = "http://127.0.0.1:8001/api/v1/ai/draft-budget";

@Controller("ai") // Base path: /api/v1/ai
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class AiController {
  /**
   * Endpoint: POST /api/v1/ai/draft-budget
   * Secure Proxy to the FastAPI AI Agent.
   * Permissions: Finance/Admin (Roles allowed to draft and review budgets).
   */
  @Post("draft-budget")
  @HttpCode(HttpStatus.OK)
  @Roles(Role.Admin, Role.Finance) // Enforce RBAC
  @UseInterceptors(FileInterceptor("file")) // Handles the 'file' field from the multipart/form-data
  async draftBudget(
    @UploadedFile() file: Express.Multer.File,
    @Body("project_name") projectName: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    @Req() req: Request, // Retained for potential future access to raw request object
  ) {
    if (!file) {
      throw new BadRequestException(
        "A file is required for AI document processing.",
      );
    }

    // 1. Create FormData object to forward the request to the Python agent
    const formData = new FormData();
    formData.append("project_name", projectName);
    // CRITICAL: Re-append the file buffer with the correct mimetype
    formData.append("file", file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype,
    });

    // 2. Forward the request to the AI Agent
    try {
      const response = await axios.post(AI_AGENT_URL, formData, {
        headers: {
          ...formData.getHeaders(), // CRITICAL: Get the boundary header from form-data
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      });

      // 3. Return the AI Agent's validated JSON object directly to the frontend
      return response.data;
    } catch (error: any) {
      // Handle network errors or errors thrown by the Python agent
      const status = error.response?.status || 500;
      const message = error.response?.data?.detail || error.message;

      throw new HttpException(message, status); // Corrected to HttpException
    }
  }
}
