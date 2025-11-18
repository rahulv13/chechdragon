import { SecretProvider } from '@/components/secret-provider';

export default function SecretLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SecretProvider>{children}</SecretProvider>;
}
