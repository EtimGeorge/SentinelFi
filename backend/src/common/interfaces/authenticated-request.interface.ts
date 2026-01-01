import { Request } from 'express';
import { JwtPayload } from 'shared/types/user';

export interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}
