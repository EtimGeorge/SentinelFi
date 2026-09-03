declare module "hpp" {
  import { RequestHandler } from "express";
  interface HppOptions {
    whitelist?: string[];
    checkBody?: boolean;
    checkBodyOnlyForContentType?: string;
    checkQuery?: boolean;
    checkBodyOnlyForContentTypeIn?: string[];
  }
  export default function hpp(options?: HppOptions): RequestHandler;
}
