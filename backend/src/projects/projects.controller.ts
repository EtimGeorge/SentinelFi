import {
  Controller,
  Post,
  Body,
  Get,
  UsePipes,
  ValidationPipe,
  HttpStatus,
  HttpCode,
  UseGuards,
  Req,
  Delete,
  Param,
  Patch,
  Query,
  ParseUUIDPipe,
  UnauthorizedException,
  Res,
  StreamableFile,
} from "@nestjs/common";
import { Response } from "express";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { Role } from "shared/types/role.enum";
import { AuthenticatedRequest } from "../common/interfaces/request.interface";
import { ProjectsService } from "./projects.service";
import { CreateProjectDto } from "./dto/create-project.dto";
import { CreateLpoDto } from "./dto/create-lpo.dto";
import { UpdateProjectDto } from "./dto/update-project.dto";
import { GetProjectsDto } from "./dto/get-projects.dto";

@Controller("projects") // Base path is /api/v1/projects
@UseGuards(RolesGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  /**
   * API Endpoint: POST /api/v1/projects
   * Permissions: Admin, ITHead, SuperAdmin
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.AdminDirector, Role.AdminManager, Role.TechnicalDirector, Role.CEO, Role.SuperAdmin)
  @UsePipes(new ValidationPipe({ transform: true }))
  async createProject(
    @Body() createProjectDto: CreateProjectDto,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!req.user || !req.user.tenant_id) {
      throw new UnauthorizedException(
        "User not authenticated or tenant ID is missing.",
      );
    }
    return this.projectsService.create(
      createProjectDto,
      req.user.id,
      req.user.tenant_id,
    );
  }

  /**
   * API Endpoint: POST /api/v1/projects/lpo
   * Permissions: Admin, Finance, SuperAdmin
   */
  @Post("lpo")
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.AdminDirector, Role.AdminManager, Role.CFO, Role.FinanceManager, Role.SuperAdmin)
  @UsePipes(new ValidationPipe({ transform: true }))
  async createLpo(
    @Body() createLpoDto: CreateLpoDto,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!req.user || !req.user.tenant_id) {
      throw new UnauthorizedException(
        "User not authenticated or tenant ID is missing.",
      );
    }
    return this.projectsService.createLpo(
      createLpoDto,
      req.user.id,
      req.user.tenant_id,
    );
  }

  /**
   * API Endpoint: GET /api/v1/projects
   * Permissions: All read roles
   */
  @Get()
  @Roles(
    Role.AdminDirector,
    Role.AdminManager,
    Role.TechnicalDirector,
    Role.CFO,
    Role.FinanceManager,
    Role.OperationalDirector,
    Role.CEO,
    Role.AssignedProjectUser,
    Role.SuperAdmin,
  )
  @UsePipes(new ValidationPipe({ transform: true }))
  async findAllProjects(
    @Query() getProjectsDto: GetProjectsDto,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!req.user || !req.user.tenant_id) {
      throw new UnauthorizedException(
        "User not authenticated or tenant ID is missing.",
      );
    }
    return this.projectsService.findAll(getProjectsDto, req.user.tenant_id);
  }

  /**
   * API Endpoint: GET /api/v1/projects/:id
   * Permissions: All read roles
   */
  @Get(":id")
  @Roles(
    Role.AdminDirector,
    Role.AdminManager,
    Role.TechnicalDirector,
    Role.CFO,
    Role.FinanceManager,
    Role.OperationalDirector,
    Role.CEO,
    Role.AssignedProjectUser,
    Role.SuperAdmin,
  )
  async findOneProject(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!req.user || !req.user.tenant_id) {
      throw new UnauthorizedException(
        "User not authenticated or tenant ID is missing.",
      );
    }
    return this.projectsService.findOne(id, req.user.tenant_id);
  }

  /**
   * API Endpoint: GET /api/v1/projects/:id/rollup
   * Permissions: All read roles
   * Retrieves a single project by ID including rollup financial data.
   */
  @Get(":id/rollup")
  @Roles(
    Role.AdminDirector,
    Role.AdminManager,
    Role.TechnicalDirector,
    Role.CFO,
    Role.FinanceManager,
    Role.OperationalDirector,
    Role.CEO,
    Role.AssignedProjectUser,
    Role.SuperAdmin,
  )
  async findOneProjectWithRollup(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!req.user || !req.user.tenant_id) {
      throw new UnauthorizedException(
        "User not authenticated or tenant ID is missing.",
      );
    }
    return this.projectsService.findOneWithRollup(id, req.user.tenant_id);
  }

  /**
   * API Endpoint: PATCH /api/v1/projects/:id
   * Permissions: Admin, ITHead, SuperAdmin
   */
  @Patch(":id")
  @Roles(Role.AdminDirector, Role.AdminManager, Role.TechnicalDirector, Role.CEO, Role.SuperAdmin)
  @UsePipes(new ValidationPipe({ transform: true }))
  async updateProject(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() updateProjectDto: UpdateProjectDto,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!req.user || !req.user.tenant_id) {
      throw new UnauthorizedException(
        "User not authenticated or tenant ID is missing.",
      );
    }
    return this.projectsService.update(
      id,
      updateProjectDto,
      req.user.tenant_id,
      req.user.id,
    );
  }

  /**
   * API Endpoint: DELETE /api/v1/projects/:id
   * Permissions: Admin, SuperAdmin
   */
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(Role.AdminDirector, Role.CEO, Role.SuperAdmin)
  async removeProject(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!req.user || !req.user.tenant_id) {
      throw new UnauthorizedException(
        "User not authenticated or tenant ID is missing.",
      );
    }
    await this.projectsService.remove(id, req.user.tenant_id, req.user.id);
  }

  /**
   * API Endpoint: PATCH /api/v1/projects/:id/archive
   * Permissions: Admin, SuperAdmin
   */
  @Patch(":id/archive")
  @Roles(Role.AdminDirector, Role.CEO, Role.SuperAdmin)
  async archiveProject(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!req.user || !req.user.tenant_id) {
      throw new UnauthorizedException("User not authenticated or tenant ID is missing.");
    }
    return this.projectsService.archive(id, req.user.tenant_id, req.user.id);
  }

  /**
   * API Endpoint: PATCH /api/v1/projects/:id/restore
   * Permissions: Admin, SuperAdmin
   */
  @Patch(":id/restore")
  @Roles(Role.AdminDirector, Role.CEO, Role.SuperAdmin)
  async restoreProject(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!req.user || !req.user.tenant_id) {
      throw new UnauthorizedException("User not authenticated or tenant ID is missing.");
    }
    return this.projectsService.restore(id, req.user.tenant_id, req.user.id);
  }

  /**
   * API Endpoint: GET /api/v1/projects/:id/cashflow
   * Permissions: Admin, Finance, SuperAdmin
   */
  @Get(":id/cashflow")
  @Roles(Role.AdminDirector, Role.AdminManager, Role.CFO, Role.FinanceManager, Role.SuperAdmin)
  async getCashFlow(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Query("year") year: number,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!req.user || !req.user.tenant_id) {
      throw new UnauthorizedException(
        "User not authenticated or tenant ID is missing.",
      );
    }
    return this.projectsService.getCashFlowHeatmap(id, req.user.tenant_id, year || new Date().getFullYear());
  }

  /**
   * API Endpoint: POST /api/v1/projects/:id/inflow
   * Permissions: Admin, Finance, SuperAdmin
   */
  @Post(":id/inflow")
  @Roles(Role.AdminDirector, Role.AdminManager, Role.CFO, Role.FinanceManager, Role.SuperAdmin)
  async createInflow(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() inflowData: any,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!req.user || !req.user.tenant_id) {
      throw new UnauthorizedException(
        "User not authenticated or tenant ID is missing.",
      );
    }
    return this.projectsService.createInflow({ ...inflowData, project_id: id }, req.user.id, req.user.tenant_id);
  }

  /**
   * API Endpoint: GET /api/v1/projects/:id/audits
   * Permissions: Admin, Finance, SuperAdmin
   */
  @Get(":id/audits")
  @Roles(Role.AdminDirector, Role.AdminManager, Role.CFO, Role.FinanceManager, Role.SuperAdmin)
  async getAudits(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!req.user || !req.user.tenant_id) {
      throw new UnauthorizedException(
        "User not authenticated or tenant ID is missing.",
      );
    }
    return this.projectsService.findAudits(id, req.user.tenant_id);
  }

  /**
   * API Endpoint: GET /api/v1/projects/:id/lpos
   * Permissions: Admin, Finance, SuperAdmin
   */
  @Get(":id/lpos")
  @Roles(Role.AdminDirector, Role.AdminManager, Role.CFO, Role.FinanceManager, Role.SuperAdmin)
  async getLpos(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!req.user || !req.user.tenant_id) {
      throw new UnauthorizedException(
        "User not authenticated or tenant ID is missing.",
      );
    }
    return this.projectsService.findLpos(id, req.user.tenant_id);
  }

  /**
   * API Endpoint: GET /api/v1/projects/:id/inflows
   * Permissions: Admin, Finance, SuperAdmin
   */
  @Get(":id/inflows")
  @Roles(Role.AdminDirector, Role.AdminManager, Role.CFO, Role.FinanceManager, Role.SuperAdmin)
  async getInflows(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!req.user || !req.user.tenant_id) {
      throw new UnauthorizedException(
        "User not authenticated or tenant ID is missing.",
      );
    }
    return this.projectsService.findInflows(id, req.user.tenant_id);
  }

  /**
   * API Endpoint: GET /api/v1/projects/export
   * Permissions: All read roles
   * Exports project data to CSV, PDF, XLSX, or DOCX.
   */
  @Get("export")
  @Roles(
    Role.AdminDirector,
    Role.AdminManager,
    Role.TechnicalDirector,
    Role.CFO,
    Role.FinanceManager,
    Role.OperationalDirector,
    Role.CEO,
    Role.AssignedProjectUser,
    Role.SuperAdmin,
  )
  async exportProjects(
    @Query() getProjectsDto: GetProjectsDto,
    @Res({ passthrough: true }) res: Response,
    @Req() req: AuthenticatedRequest,
    @Query("format") format?: "csv" | "pdf" | "xlsx" | "docx",
  ): Promise<StreamableFile> {
    if (!req.user || !req.user.tenant_id) {
      throw new UnauthorizedException(
        "User not authenticated or tenant ID is missing.",
      );
    }
    const exportFormat = format || "csv"; // Default to CSV
    const data = await this.projectsService.exportProjectsToFormat(
      getProjectsDto,
      exportFormat,
      req.user.tenant_id,
    );
    const filename = `projects_export_${new Date().toISOString()}`;

    let contentType: string;

    switch (exportFormat) {
      case "pdf":
        contentType = "application/pdf";
        res.set({
          "Content-Type": contentType,
          "Content-Disposition": `attachment; filename="${filename}.pdf"`,
        });
        break;
      case "xlsx":
        contentType =
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        res.set({
          "Content-Type": contentType,
          "Content-Disposition": `attachment; filename="${filename}.xlsx"`,
        });
        break;
      case "docx":
        contentType =
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        res.set({
          "Content-Type": contentType,
          "Content-Disposition": `attachment; filename="${filename}.docx"`,
        });
        break;
      default: // csv
        contentType = "text/csv";
        res.set({
          "Content-Type": contentType,
          "Content-Disposition": `attachment; filename="${filename}.csv"`,
        });
        break;
    }

    return new StreamableFile(data as Buffer);
  }
}
