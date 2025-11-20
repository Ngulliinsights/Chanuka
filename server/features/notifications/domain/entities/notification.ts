import { NotificationType } from '@shared/schema';

export class Notification {
  private constructor(
    private readonly _id: string,
    private readonly _user_id: string,
    private _notification_type: NotificationType,
    private _title: string,
    private _message: string,
    private readonly _related_bill_id?: string,
    private readonly _related_comment_id?: string,
    private readonly _related_user_id?: string,
    private _is_read: boolean = false,
    private _read_at?: Date,
    private _is_dismissed: boolean = false,
    private _delivery_method: string = 'in_app',
    private _delivery_status: string = 'pending',
    private _action_taken: boolean = false,
    private _action_type?: string,
    private readonly _created_at: Date = new Date(),
    private _updated_at: Date = new Date()
  ) {}

  static create(data: {
    id: string;
    user_id: string;
    notification_type: NotificationType;
    title: string;
    message: string;
    related_bill_id?: string;
    related_comment_id?: string;
    related_user_id?: string;
    is_read?: boolean;
    read_at?: Date;
    is_dismissed?: boolean;
    delivery_method?: string;
    delivery_status?: string;
    action_taken?: boolean;
    action_type?: string;
    created_at?: Date;
    updated_at?: Date;
  }): Notification {
    return new Notification(
      data.id,
      data.user_id,
      data.notification_type,
      data.title,
      data.message,
      data.related_bill_id,
      data.related_comment_id,
      data.related_user_id,
      data.is_read ?? false,
      data.read_at,
      data.is_dismissed ?? false,
      data.delivery_method ?? 'in_app',
      data.delivery_status ?? 'pending',
      data.action_taken ?? false,
      data.action_type,
      data.created_at ?? new Date(),
      data.updated_at ?? new Date()
    );
  }

  // Getters
  get id(): string {
    return this._id;
  }

  get user_id(): string {
    return this._user_id;
  }

  get notification_type(): NotificationType {
    return this._notification_type;
  }

  get title(): string {
    return this._title;
  }

  get message(): string {
    return this._message;
  }

  get related_bill_id(): string | undefined {
    return this._related_bill_id;
  }

  get related_comment_id(): string | undefined {
    return this._related_comment_id;
  }

  get related_user_id(): string | undefined {
    return this._related_user_id;
  }

  get is_read(): boolean {
    return this._is_read;
  }

  get read_at(): Date | undefined {
    return this._read_at;
  }

  get is_dismissed(): boolean {
    return this._is_dismissed;
  }

  get delivery_method(): string {
    return this._delivery_method;
  }

  get delivery_status(): string {
    return this._delivery_status;
  }

  get action_taken(): boolean {
    return this._action_taken;
  }

  get action_type(): string | undefined {
    return this._action_type;
  }

  get created_at(): Date {
    return this._created_at;
  }

  get updated_at(): Date {
    return this._updated_at;
  }

  // Business methods
  markAsRead(): void {
    this._is_read = true;
    this._read_at = new Date();
    this._updated_at = new Date();
  }

  markAsUnread(): void {
    this._is_read = false;
    this._read_at = undefined;
    this._updated_at = new Date();
  }

  dismiss(): void {
    this._is_dismissed = true;
    this._updated_at = new Date();
  }

  updateDeliveryStatus(status: string): void {
    this._delivery_status = status;
    this._updated_at = new Date();
  }

  recordAction(actionType: string): void {
    this._action_taken = true;
    this._action_type = actionType;
    this._updated_at = new Date();
  }

  isPending(): boolean {
    return this._delivery_status === 'pending';
  }

  isDelivered(): boolean {
    return this._delivery_status === 'delivered';
  }

  isFailed(): boolean {
    return this._delivery_status === 'failed';
  }

  equals(other: Notification): boolean {
    return this._id === other._id;
  }

  toJSON() {
    return {
      id: this._id,
      user_id: this._user_id,
      notification_type: this._notification_type,
      title: this._title,
      message: this._message,
      related_bill_id: this._related_bill_id,
      related_comment_id: this._related_comment_id,
      related_user_id: this._related_user_id,
      is_read: this._is_read,
      read_at: this._read_at,
      is_dismissed: this._is_dismissed,
      delivery_method: this._delivery_method,
      delivery_status: this._delivery_status,
      action_taken: this._action_taken,
      action_type: this._action_type,
      created_at: this._created_at,
      updated_at: this._updated_at
    };
  }
}