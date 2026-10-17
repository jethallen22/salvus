"use client";

import { useState } from "react";
import { MAX_SOCIAL_LINKS, SOCIAL_PLATFORM_IDS, SOCIAL_PLATFORMS } from "@/constants/social-platforms";
import type { SocialLink } from "@/types/wallet";
import { Button } from "@/components/ui/button";
import { fieldA11y } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";

type Props = { initialLinks: SocialLink[]; errors: Record<string, string> };

/** Editable list of social links, submitted as one JSON hidden field. */
export function SocialLinksField({ initialLinks, errors }: Props) {
  const [links, setLinks] = useState<SocialLink[]>(initialLinks);

  const update = (index: number, patch: Partial<SocialLink>) =>
    setLinks((current) => current.map((link, i) => (i === index ? { ...link, ...patch } : link)));

  return (
    <div className="flex flex-col gap-4">
      <input type="hidden" name="social_links" value={JSON.stringify(links)} />

      {links.length === 0 && <p className="text-muted-foreground">No links yet.</p>}

      {links.map((link, index) => {
        const id = `social-${index}`;
        const error = errors[`social_links.${index}.url`] ?? errors[`social_links.${index}.platform`];
        return (
          <div key={index} className="flex flex-col gap-2">
            <div className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)] gap-2 sm:grid-cols-[10rem_minmax(0,1fr)_auto]">
              <label htmlFor={`${id}-platform`} className="sr-only">
                Platform {index + 1}
              </label>
              <Select
                id={`${id}-platform`}
                value={link.platform}
                onChange={(e) => update(index, { platform: e.target.value as SocialLink["platform"] })}
              >
                {SOCIAL_PLATFORM_IDS.map((platform) => (
                  <option key={platform} value={platform}>
                    {SOCIAL_PLATFORMS[platform].label}
                  </option>
                ))}
              </Select>
              <label htmlFor={id} className="sr-only">
                {SOCIAL_PLATFORMS[link.platform].label} link
              </label>
              <Input
                {...fieldA11y(id, error)}
                type="url"
                inputMode="url"
                placeholder={`https://${SOCIAL_PLATFORMS[link.platform].hosts[0]}/yourname`}
                value={link.url}
                onChange={(e) => update(index, { url: e.target.value })}
              />
              <Button
                variant="ghost"
                className="col-span-2 justify-self-end sm:col-span-1"
                onClick={() => setLinks((current) => current.filter((_, i) => i !== index))}
              >
                Remove
              </Button>
            </div>
            {error && (
              <p id={`${id}-error`} className="text-sm text-destructive">
                {error}
              </p>
            )}
          </div>
        );
      })}

      <div>
        <Button
          variant="outline"
          disabled={links.length >= MAX_SOCIAL_LINKS}
          onClick={() => setLinks((current) => [...current, { platform: "instagram", url: "" }])}
        >
          Add a link
        </Button>
      </div>
      {errors.social_links && <p className="text-sm text-destructive">{errors.social_links}</p>}
    </div>
  );
}
