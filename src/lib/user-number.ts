export function generateUserNumber(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  const number = Math.abs(hash) % 10000;
  return number.toString().padStart(4, '0');
}
