import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string) {
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(dateString));
}

export function formatPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return '—';
  
  // Supprime tout ce qui n'est pas un chiffre
  let digits = phone.replace(/\D/g, '');
  
  // Si le numéro fait 9 chiffres et ne commence pas par 0, on ajoute le 0
  if (digits.length === 9 && digits[0] !== '0') {
    digits = '0' + digits;
  }
  
  // Formatage final: 034 11 222 33
  if (digits.length === 10) {
    return digits.replace(/(\d{3})(\d{2})(\d{3})(\d{2})/, '$1 $2 $3 $4');
  }
  
  return phone; // Retourne tel quel si format non reconnu
}
