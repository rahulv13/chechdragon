import * as React from "react";
import Image from "next/image";

export const DraglistLogo: React.FC<React.SVGProps<SVGSVGElement>> = ({
  className,
  style,
  ...props
}) => (
  <div className={className} style={{...style, position: 'relative'}}>
      <Image
        src="https://i.imgur.com/rS0BFxW.png"
        alt="Draglist Logo"
        layout="fill"
        objectFit="cover"
        data-ai-hint="dragon logo"
      />
  </div>
);

export const Logo = DraglistLogo;
