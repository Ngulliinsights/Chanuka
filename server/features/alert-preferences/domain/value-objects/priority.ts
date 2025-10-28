/**
 * Priority Value Object
 * Represents the priority levels for alerts
 */
export class Priority {
  private constructor(private readonly value: string) {}

  static readonly LOW = new Priority('low');
  static readonly NORMAL = new Priority('normal');
  static readonly HIGH = new Priority('high');
  static readonly URGENT = new Priority('urgent');

  static fromString(value: string): Priority {
    switch (value) {
      case 'low':
        return Priority.LOW;
      case 'normal':
        return Priority.NORMAL;
      case 'high':
        return Priority.HIGH;
      case 'urgent':
        return Priority.URGENT;
      default:
        throw new Error(`Invalid priority: ${value}`);
    }
  }

  toString(): string {
    return this.value;
  }

  equals(other: Priority): boolean {
    return this.value === other.value;
  }

  isHigherThan(other: Priority): boolean {
    const order = ['low', 'normal', 'high', 'urgent'];
    return order.indexOf(this.value) > order.indexOf(other.value);
  }

  isLowerThan(other: Priority): boolean {
    return !this.equals(other) && !this.isHigherThan(other);
  }
}





































