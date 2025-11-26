import { Controller, Post, Body, UseGuards, Get, HttpStatus, UsePipes, ValidationPipe } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import { LoginUserDto } from './dto/login-user.dto'; // <-- New Import

@Controller('auth') // Base path is /api/v1/auth
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * API Endpoint: POST /api/v1/auth/login
   * Phase 3 Deliverable: User Login
   */
  @Post('login')
  @UsePipes(new ValidationPipe({ transform: true }))
  async login(@Body() loginDto: LoginUserDto) {
    return this.authService.login(loginDto);
  }

  /**
   * API Endpoint: GET /api/v1/auth/test-secure
   * Utility for testing if the JWT is valid and user data is attached to the request.
   */
  @UseGuards(AuthGuard('jwt')) // Protect this route using the JWT Strategy
  @Get('test-secure')
  // We use a custom decorator (to be created next) to get the user, but for now, we use a simple Body accessor
  async getProfile(@Body() req: any) { 
    // In a final implementation, user data would be extracted from the @Req() or a custom @User() decorator
    return { 
      message: 'Authentication successful. Token is valid.',
      // Assuming the user data is available on the request after the guard runs (in development)
    };
  }
}