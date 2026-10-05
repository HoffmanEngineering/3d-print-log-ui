import { UserSummaryDto } from '../services/user.service';
import { AchievementNotification } from './achievement';

export enum NotificationType {
  Comment = 1,
  PrintCompleted = 2,
  PrintFailed = 3,
  Achievement = 4,
  SystemAnnouncement = 5,
  SubscriptionActivated = 6,
  SubscriptionPaymentFailed = 7,
  SubscriptionCanceled = 8,
}

export interface NotificationSummaryDto {
  id: string;
  type: NotificationType;
  title: string;
  message: string | null;
  isRead: boolean;
  createdDate: Date;
  actionUrl: string | null;
  printId: number | null;
  printTitle: string | null;
  triggeredByUser: UserSummaryDto | null;
  /** Parsed metadata of an Achievement notification; null for every other type. */
  achievement?: AchievementNotification | null;
}

export interface UnreadCountResponse {
  unreadCount: number;
  /** How many of the unread notifications are achievements: the celebration signal. */
  unreadAchievementCount?: number;
}

export interface MarkNotificationsReadRequest {
  notificationIds: string[];
}
