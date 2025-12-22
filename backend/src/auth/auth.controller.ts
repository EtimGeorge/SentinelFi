import { Controller, Post, Body, Get, UsePipes, ValidationPipe, HttpStatus, HttpCode, UseGuards, Req, Res, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import { LoginUserDto } from './dto/login-user.dto';
import { Response } from 'express'; 

@Controller('auth') 
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * API Endpoint: POST /api/v1/auth/login
   * FINAL FIX: Proper response handling to avoid 401 conflict.
   */
  @Post('login')
  @HttpCode(HttpStatus.OK) 
  @UsePipes(new ValidationPipe({ transform: true }))
  async login(
    @Body() loginDto: LoginUserDto, 
    @Res({ passthrough: true }) response: Response
  ) {
    try {
      // 1. Get user and validate credentials (AuthService handles validation)
      const result = await this.authService.login(loginDto);
      
      // 2. Set the HttpOnly cookie
      response.cookie('access_token', result.access_token, {
        httpOnly: true, 
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict', // Using 'strict' as mandated by our security policy
        maxAge: 3600000, // 1 hour (matches JWT lifetime)
      });
      
      // 3. Return the success payload
      return {
        success: true, // New explicit success flag
        user_role: result.user_role,
      };
    } catch (error) {
      // Catch any validation error thrown by the AuthService and convert it to 401
      // Note: NestJS's global exception filter should handle this, but explicit log is fine.
      console.error('Login controller error:', error);
      throw new UnauthorizedException('Invalid credentials');
    }
  }

  /**
   * API Endpoint: POST /api/v1/auth/logout
   * Clears the HttpOnly JWT cookie.
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Res({ passthrough: true }) response: Response) {
    response.cookie('access_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      expires: new Date(0), 
    });
    
    return { message: 'Logout successful. Session cookie cleared.' };
  }

  /**
   * API Endpoint: GET /api/v1/auth/test-secure
   * Used by frontend to verify HttpOnly cookie status and get user data.
   */
  @UseGuards(AuthGuard('jwt')) 
  @Get('test-secure')
  async getProfile(@Req() req: any) { 
    return { 
      message: 'Authentication successful via HttpOnly cookie.',
      user_data_from_token: req.user, 
    };
  }
}