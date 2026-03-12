import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import { DocumentControlEntity } from "../common/entities/document-control.entity";
import * as fs from "fs";

@Injectable()
export class DcsClientService {
  private readonly logger = new Logger(DcsClientService.name);
  private readonly dcsApiUrl: string | undefined;
  private readonly dcsApiKey: string | undefined;

  constructor(private readonly configService: ConfigService) {
    this.dcsApiUrl = this.configService.get<string>("DCS_EXTERNAL_API_URL");
    this.dcsApiKey = this.configService.get<string>("DCS_EXTERNAL_API_KEY");
  }

  async pushReportToExternalDcs(document: DocumentControlEntity): Promise<boolean> {
    if (!this.dcsApiUrl) {
      this.logger.warn("DCS_EXTERNAL_API_URL not configured. Skipping external push.");
      return false;
    }

    try {
      this.logger.log(`Pushing report ${document.id} to external DCS: ${this.dcsApiUrl}`);
      
      // Load file from path (assuming local file storage for this implementation)
      // In a real S3 scenario, we'd fetch the stream from S3.
      const fileBuffer = fs.readFileSync(document.file_path);
      const base64File = fileBuffer.toString("base64");

      const payload = {
        reportId: document.id,
        tenantId: document.tenant_id,
        reportType: document.report_type,
        fileName: document.file_name,
        mimeType: document.mime_type,
        fileContent: base64File,
        metadata: document.metadata,
        timestamp: new Date().toISOString(),
      };

      const response = await axios.post(this.dcsApiUrl, payload, {
        headers: {
          "X-API-KEY": this.dcsApiKey || "",
          "Content-Type": "application/json",
        },
        timeout: 30000, // 30s timeout for external sync
      });

      if (response.status === 200 || response.status === 201) {
        this.logger.log(`Successfully pushed report ${document.id} to external DCS.`);
        return true;
      }

      this.logger.error(`Failed to push to DCS. Status: ${response.status}`);
      return false;
    } catch (e: any) {
      this.logger.error(`Error during DCS external push: ${e.message}`);
      return false;
    }
  }
}
