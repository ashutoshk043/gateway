import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { Observable } from 'rxjs';

interface AuthServiceGrpc {
  findUser(data: { id: string }): Observable<any>;
  validateUser(data: { token: string }): Observable<any>;
}

interface RestaurantServiceGrpc {
  getRestaurant(data: { id: string }): Observable<any>;
}

@Injectable()
export class GrpcService implements OnModuleInit {
  private authService: AuthServiceGrpc;
  private restaurantService: RestaurantServiceGrpc;

  constructor(
    // @Inject('AUTH_PACKAGE') private authClient: ClientGrpc,
    // @Inject('RESTAURANT_PACKAGE') private restaurantClient: ClientGrpc,
  ) {}

  onModuleInit() {
    // this.authService = this.authClient.getService<AuthServiceGrpc>('AuthService');
    // this.restaurantService =
    //   this.restaurantClient.getService<RestaurantServiceGrpc>('RestaurantService');
  }

  // AUTH CALLS
  findUser(id: string) {
    return this.authService.findUser({ id });
  }

  validateUser(token: string) {
    return this.authService.validateUser({ token });
  }

  // RESTAURANT CALLS
  getRestaurant(id: string) {
    return this.restaurantService.getRestaurant({ id });
  }
}
