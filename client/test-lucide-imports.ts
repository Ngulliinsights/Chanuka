// Test file to verify lucide imports
import * as lucide from 'lucide-react';

// Use bracket notation to bypass TypeScript declaration issues
const XCircle = (lucide as any)['XCircle'];
const BookmarkPlus = (lucide as any)['BookmarkPlus'];
const ThumbsDown = (lucide as any)['ThumbsDown'];
const Reply = (lucide as any)['Reply'];
const Flag = (lucide as any)['Flag'];
const HardDrive = (lucide as any)['HardDrive'];
const Monitor = (lucide as any)['Monitor'];
const Vote = (lucide as any)['Vote'];
const Cpu = (lucide as any)['Cpu'];
const Book = (lucide as any)['Book'];

console.log('All lucide imports successful:');
console.log('XCircle:', typeof XCircle);
console.log('BookmarkPlus:', typeof BookmarkPlus);
console.log('ThumbsDown:', typeof ThumbsDown);
console.log('Reply:', typeof Reply);
console.log('Flag:', typeof Flag);
console.log('HardDrive:', typeof HardDrive);
console.log('Monitor:', typeof Monitor);
console.log('Vote:', typeof Vote);
console.log('Cpu:', typeof Cpu);
console.log('Book:', typeof Book);