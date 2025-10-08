import Image from 'next/image';

export function Logo() {
  return (
    <div className="flex items-center gap-2" style={{ width: '150px' }}>
      <Image
        src="/logo.svg"
        alt="SLOB_SERVIÇOS Logo"
        width={150}
        height={150}
        priority
      />
    </div>
  );
}
