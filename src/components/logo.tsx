import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import logoColor from '@/pic/logo-lawslane-transparent-color.png';
import logoWhite from '@/pic/logo-lawslane-transparent-white.png';

type LogoProps = {
  className?: string;
  href: string;
  variant?: 'color' | 'white';
  showText?: boolean;
};

export default function Logo({ className, href, variant = 'color', showText = true, subtitle }: LogoProps & { subtitle?: string }) {
  const logoSrc = variant === 'color' ? logoColor : logoWhite;

  return (
    <Link href={href} className={cn('flex items-center gap-2', className)}>
      <Image
        src={logoSrc}
        alt="Lawslane Logo"
        width={150}
        height={40}
        className="h-8 w-auto"
        priority
      />
      {(showText || subtitle) && (
        <div className="flex flex-col">
          {showText && (
            <span className={cn(
              "text-xl font-bold font-headline transition-colors leading-none",
              variant === 'white' ? "text-white" : "text-foreground"
            )}>
              Lawslane
            </span>
          )}
          {subtitle && (
            <span className={cn(
              "text-[10px] font-bold uppercase tracking-widest mt-0.5 transition-colors leading-none",
              variant === 'white' ? "text-white/60" : "text-blue-600"
            )}>
              {subtitle}
            </span>
          )}
        </div>
      )}
    </Link>
  );
}
