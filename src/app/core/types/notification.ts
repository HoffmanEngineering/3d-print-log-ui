import { UserSummaryDto } from '../services/user.service';

export enum NotificationType {
  Comment = 1,
  PrintCompleted = 2,
  PrintFailed = 3,
  Achievement = 4,
  SystemAnnouncement = 5,
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
}

export interface UnreadCountResponse {
  unreadCount: number;
}

export interface MarkNotificationsReadRequest {
  notificationIds: string[];
}
