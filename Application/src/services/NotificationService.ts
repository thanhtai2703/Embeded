import { Subject } from 'rxjs';

export interface NotificationData {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'warning' | 'danger' | 'info';
  icon?: string;
  duration?: number;
  timestamp: number;
}

class NotificationService {
  private notificationSubject = new Subject<NotificationData>();
  private activeNotifications: NotificationData[] = [];

  // Observable that components can subscribe to
  public notifications$ = this.notificationSubject.asObservable();

  // Show a notification
  public show(notification: Omit<NotificationData, 'id' | 'timestamp'>): string {
    const id = Math.random().toString(36).substring(2, 11);
    const timestamp = Date.now();
    
    const newNotification: NotificationData = {
      ...notification,
      id,
      timestamp,
      duration: notification.duration || 5000, // Default 5 seconds
    };

    this.activeNotifications.push(newNotification);
    this.notificationSubject.next(newNotification);
    
    // Auto-dismiss after duration
    setTimeout(() => {
      this.dismiss(id);
    }, newNotification.duration);

    return id;
  }

  // Show a success notification
  public success(title: string, message: string, options?: { duration?: number, icon?: string }): string {
    return this.show({
      title,
      message,
      type: 'success',
      icon: options?.icon || 'checkmark-circle',
      duration: options?.duration,
    });
  }

  // Show a warning notification
  public warning(title: string, message: string, options?: { duration?: number, icon?: string }): string {
    return this.show({
      title,
      message,
      type: 'warning',
      icon: options?.icon || 'alert-circle',
      duration: options?.duration,
    });
  }

  // Show a danger notification
  public danger(title: string, message: string, options?: { duration?: number, icon?: string }): string {
    return this.show({
      title,
      message,
      type: 'danger',
      icon: options?.icon || 'warning',
      duration: options?.duration || 7000, // Longer duration for danger notifications
    });
  }

  // Show an info notification
  public info(title: string, message: string, options?: { duration?: number, icon?: string }): string {
    return this.show({
      title,
      message,
      type: 'info',
      icon: options?.icon || 'information-circle',
      duration: options?.duration,
    });
  }

  // Dismiss a notification by id
  public dismiss(id: string): void {
    const index = this.activeNotifications.findIndex(n => n.id === id);
    if (index !== -1) {
      this.activeNotifications.splice(index, 1);
      // Emit the updated list to subscribers
      this.notificationSubject.next({ ...this.activeNotifications[0], id: 'dismiss_' + id });
    }
  }

  // Dismiss all notifications
  public dismissAll(): void {
    this.activeNotifications = [];
    // Emit an empty notification to clear all
    this.notificationSubject.next({
      id: 'dismiss_all',
      title: '',
      message: '',
      type: 'info',
      timestamp: Date.now(),
    });
  }

  // Get all active notifications
  public getActiveNotifications(): NotificationData[] {
    return [...this.activeNotifications];
  }
}

// Create a singleton instance
const notificationService = new NotificationService();
export default notificationService;