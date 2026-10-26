import { ACTIVE_RUN_STATUSES } from "@rakazo/core";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  BOT_AVATAR_COLORS,
  BotAvatar,
  BotShapePreview,
  DEFAULT_BOT_AVATAR_COLOR,
  defaultBotAvatarValue,
  parseBotAvatar,
  resolvePersonaColorDef,
} from "./bot-avatar.js";

describe("BotAvatar", () => {
  it("renders distinct SVG gradient IDs for concurrent working avatars", () => {
    const html = renderToString(
      <div>
        <BotAvatar color="#8B5CF6::shape_0" status="running" />
        <BotAvatar color="#10B981::shape_1" status="running" />
      </div>,
    );

    const gradMatches = [...html.matchAll(/id="([^"]+)"/g)].map((m) => m[1]);
    expect(gradMatches.length).toBeGreaterThan(0);
    expect(new Set(gradMatches).size).toBe(gradMatches.length);
    for (const id of gradMatches) {
      expect(id).toBeTruthy();
      expect(html).toContain(`url(#${id})`);
    }
  });

  // Button sizes any SVG without a size class, which beats width/height attributes but not inline styles.
  it("sizes the shape with an inline style so icon sizing in a button cannot shrink it", () => {
    const html = renderToString(<BotAvatar color="#8B5CF6::shape_0" size={26} />);
    const shape = html.match(/<svg[^>]*data-mascot[^>]*>/)?.[0];
    expect(shape).toMatch(/style="[^"]*width:26px;height:26px/);
  });

  it.each([...ACTIVE_RUN_STATUSES])("marks active run status %s as working", (status) => {
    const html = renderToString(<BotAvatar color="#3B82F6" status={status} />);
    expect(html).toContain("<svg");
    expect(html).toContain('data-working="true"');
  });

  it("keeps working attribute false when idle", () => {
    const html = renderToString(<BotAvatar color="#F59E0B" status="idle" />);
    expect(html).toContain('data-working="false"');
  });

  it("paints the mascot in each bot's colour", () => {
    const green = renderToString(<BotAvatar color="#10B981" identity="maya" />);
    const blue = renderToString(<BotAvatar color="#3B82F6" identity="maya" />);
    expect(green).toContain(`stop-color="${resolvePersonaColorDef("maya", "#10B981").light}"`);
    expect(blue).toContain(`stop-color="${resolvePersonaColorDef("maya", "#3B82F6").light}"`);
    expect(green).not.toEqual(blue);
  });

  it("parses shape indexes from encoded color values", () => {
    const parsed = parseBotAvatar(`${DEFAULT_BOT_AVATAR_COLOR}::shape_3`);
    expect(parsed.color).toBe(DEFAULT_BOT_AVATAR_COLOR);
    expect(parsed.shapeIndex).toBe(3);
    expect(parsed.isImage).toBe(false);
  });

  it("normalizes malformed shape suffixes to shape 0", () => {
    expect(parseBotAvatar(`${DEFAULT_BOT_AVATAR_COLOR}::shape_-1`).shapeIndex).toBe(0);
    expect(parseBotAvatar(`${DEFAULT_BOT_AVATAR_COLOR}::shape_3junk`).shapeIndex).toBe(0);
    expect(parseBotAvatar(`${DEFAULT_BOT_AVATAR_COLOR}::shape_`).shapeIndex).toBe(0);
  });

  it("resolves explicit colors and shapes", () => {
    expect(resolvePersonaColorDef("bot", "#10B981").hex.toLowerCase()).toBe("#10b981");
    expect(resolvePersonaColorDef("bot", "#fff").hex).toBe("#fff");
    expect(BOT_AVATAR_COLORS.length).toBeGreaterThan(0);
  });

  it("falls back to the identity palette for invalid custom hex", () => {
    expect(resolvePersonaColorDef("bot", "#zzzzzz")).toEqual(resolvePersonaColorDef("bot"));
    expect(resolvePersonaColorDef("bot", "#ggg")).toEqual(resolvePersonaColorDef("bot"));
  });

  it("renders uploaded images without the geometric svg", () => {
    const html = renderToString(
      <BotAvatar color="data:image/png;base64,abc" identity="maya" size={32} />,
    );
    expect(html).toContain("<img");
    expect(html).not.toContain("<path");
    expect(html).not.toContain("bot-character-eyes");
  });

  it("keeps a working photo ring outside the clipped image and uses the status token", () => {
    const html = renderToString(
      <BotAvatar color="data:image/png;base64,abc" identity="maya" size={32} status="running" />,
    );
    expect(html).toContain('class="rakazo-bot-avatar relative shrink-0 select-none"');
    expect(html).toContain("rakazo-bot-avatar-picture");
    expect(html).toContain("rakazo-bot-avatar-ring-working");
    expect(html).toContain("stroke-status-working");
    expect(html).toContain('data-working="true"');
    expect(html.indexOf("rakazo-bot-avatar-picture")).toBeLessThan(
      html.indexOf("rakazo-bot-avatar-ring"),
    );
  });

  it("keeps idle photo avatars ring-free", () => {
    const html = renderToString(
      <BotAvatar color="data:image/png;base64,abc" identity="maya" size={32} status="idle" />,
    );
    expect(html).toContain("rakazo-bot-avatar-picture");
    expect(html).toContain('data-working="false"');
    expect(html).not.toContain("rakazo-bot-avatar-ring");
  });

  it("does not treat arbitrary http(s) color values as remote images", () => {
    const parsed = parseBotAvatar("https://evil.example/track.png");
    expect(parsed.isImage).toBe(false);
    expect(parsed.imageUrl).toBeUndefined();
    const html = renderToString(
      <BotAvatar color="https://evil.example/track.png" identity="maya" size={32} />,
    );
    expect(html).not.toContain("<img");
    expect(html).not.toContain("evil.example");
  });

  it("rings a working mascot with the status token", () => {
    const html = renderToString(
      <BotAvatar color="#8B5CF6::shape_0" identity="maya" size={32} status="running" />,
    );
    expect(html).toContain('data-mascot="gettime"');
    expect(html).toContain("rakazo-bot-avatar-ring-working");
    expect(html).toContain("stroke-status-working");
  });

  it("restores a plain color without the pinned shape", () => {
    expect(defaultBotAvatarValue(`${DEFAULT_BOT_AVATAR_COLOR}::shape_3`)).toBe(
      DEFAULT_BOT_AVATAR_COLOR,
    );
    expect(defaultBotAvatarValue("#EAB308::shape_1")).toBe("#EAB308");
    expect(defaultBotAvatarValue("#abc::shape_2")).toBe("#abc");
    expect(defaultBotAvatarValue("#fff")).toBe("#fff");
    expect(defaultBotAvatarValue("data:image/png;base64,abc")).toBe(DEFAULT_BOT_AVATAR_COLOR);
    expect(defaultBotAvatarValue("#zzzzzz::shape_1")).toBe(DEFAULT_BOT_AVATAR_COLOR);
    expect(defaultBotAvatarValue("")).toBe(DEFAULT_BOT_AVATAR_COLOR);

    const restored = renderToString(
      <BotAvatar
        color={defaultBotAvatarValue(`${DEFAULT_BOT_AVATAR_COLOR}::shape_4`)}
        identity="maya"
      />,
    );
    const shaped = renderToString(
      <BotAvatar color={`${DEFAULT_BOT_AVATAR_COLOR}::shape_4`} identity="maya" />,
    );
    expect(restored).toContain('data-mascot="gettime"');
    expect(shaped).toContain('data-mascot="gettime"');
  });

  it("exposes shape picker name and pressed state", () => {
    const html = renderToString(
      <BotShapePreview shapeIndex={0} color="#8B5CF6" selected onClick={() => undefined} />,
    );
    expect(html).toContain('aria-label="hex"');
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain("focus-visible:ring-2");
  });

  it("previews the mascot when no studio shape is given", () => {
    const html = renderToString(
      <BotShapePreview identity="maya" label="Shape 1" color="#8B5CF6" selected={false} />,
    );
    expect(html).toContain('aria-label="Shape 1"');
    expect(html).toContain('data-mascot="gettime"');
  });

  it("draws every plain-colour bot as the Gettime mascot", () => {
    const html = renderToString(<BotAvatar color={DEFAULT_BOT_AVATAR_COLOR} identity="maya" />);
    expect(html).toContain('data-mascot="gettime"');
  });

  it("keeps uploaded images", () => {
    const html = renderToString(<BotAvatar color="data:image/png;base64,abc" identity="maya" />);
    expect(html).toContain("<img");
    expect(html).not.toContain('data-mascot="gettime"');
  });

  it("draws an encoded studio shape as the mascot too", () => {
    const html = renderToString(
      <BotAvatar color={`${DEFAULT_BOT_AVATAR_COLOR}::shape_3`} identity="maya" />,
    );
    expect(html).toContain('data-mascot="gettime"');
  });

  it("paints the mascot with the resolved palette when the custom color is invalid", () => {
    const fallback = resolvePersonaColorDef("maya", "#zzzzzz");
    const html = renderToString(<BotAvatar color="#zzzzzz" identity="maya" />);
    expect(html).toContain(`stop-color="${fallback.light}"`);
    expect(html).not.toContain("#zzzzzz");
  });
});
