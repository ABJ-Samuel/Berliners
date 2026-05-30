import type { User } from './types';

// Where a logged-in user should land, based on onboarding state and role.
export function landingPath(user: User): string {
  if (!user.onboarded) return '/profile';
  return user.type === 'company' ? '/recommend' : '/upload';
}
