"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDesk } from "@/components/desk-provider";
import { DESK_VIEWS, PEOPLE } from "@/lib/claims";

export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { person, setPersonId, resetClaims } = useDesk();
  const viewLabel =
    DESK_VIEWS.find((item) => item.href === pathname)?.label ?? "Work Hub";

  return (
    <header className="relative flex h-20 shrink-0 items-center px-5">
      <div className="flex items-center gap-1">
        <img src="/figma/logo.svg" alt="" width={24} height={24} />
        <p className="text-[20px] leading-[normal] whitespace-nowrap text-bone">
          <span className="font-semibold">Work</span>
          <span className="font-normal">Hub</span>
        </p>
      </div>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-1 text-sm font-medium text-bone outline-none">
            {viewLabel}
            <img src="/figma/chevron.svg" alt="" width={16} height={16} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center">
            {DESK_VIEWS.map((item) => (
              <DropdownMenuItem
                key={item.id}
                asChild
                onSelect={() => router.push(item.href)}
              >
                <Link href={item.href} className="text-inherit">
                  {item.label}
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Switch department"
            className="flex items-center gap-1 text-sm font-medium text-bone outline-none"
          >
            {person.role}
            <img src="/figma/chevron.svg" alt="" width={16} height={16} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Department</DropdownMenuLabel>
            {PEOPLE.map((item) => (
              <DropdownMenuItem key={item.id} onSelect={() => setPersonId(item.id)}>
                {item.role}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={resetClaims}>Reset sample claims</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
