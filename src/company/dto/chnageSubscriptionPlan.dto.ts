import { IsEnum, IsNotEmpty } from 'class-validator';
import { SubscriptionPlan } from 'src/enums/subscriptions.enum';

export class ChangeSubscriptionPlanDto {
  @IsEnum(SubscriptionPlan)
  @IsNotEmpty()
  subscriptionPlan: SubscriptionPlan;
}
