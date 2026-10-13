import { notFound } from 'next/navigation';
import Preview from './preview';

export const dynamic = 'force-dynamic';

export default function Page() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <Preview />;
}
