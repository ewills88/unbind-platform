import { redirect } from 'next/navigation'

export default function AuthSignInRedirect() {
  redirect('/login')
}
