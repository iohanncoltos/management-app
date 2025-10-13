// Mention detection and parsing utilities

export interface Mention {
  type: "user" | "all";
  userId?: string;
  userName?: string;
  startIndex: number;
  endIndex: number;
  displayText: string;
}

/**
 * Parse message content to extract mentions
 * Matches patterns like @username, @all, @[Name](userId)
 */
export function parseMentions(content: string): Mention[] {
  const mentions: Mention[] = [];

  // Match @all
  const allPattern = /@all\b/gi;
  let allMatch;
  while ((allMatch = allPattern.exec(content)) !== null) {
    mentions.push({
      type: "all",
      startIndex: allMatch.index,
      endIndex: allMatch.index + allMatch[0].length,
      displayText: "@all",
    });
  }

  // Match formatted mentions: @[Display Name](userId)
  const formattedPattern = /@\[([^\]]+)\]\(([^)]+)\)/g;
  let formattedMatch;
  while ((formattedMatch = formattedPattern.exec(content)) !== null) {
    mentions.push({
      type: "user",
      userId: formattedMatch[2],
      userName: formattedMatch[1],
      startIndex: formattedMatch.index,
      endIndex: formattedMatch.index + formattedMatch[0].length,
      displayText: `@${formattedMatch[1]}`,
    });
  }

  return mentions.sort((a, b) => a.startIndex - b.startIndex);
}

/**
 * Extract user IDs from mentions in a message
 */
export function extractMentionedUserIds(content: string): string[] {
  const mentions = parseMentions(content);
  const userIds = mentions
    .filter((m) => m.type === "user" && m.userId)
    .map((m) => m.userId!);
  return Array.from(new Set(userIds)); // Remove duplicates
}

/**
 * Check if message mentions @all
 */
export function hasMentionAll(content: string): boolean {
  return /@all\b/i.test(content);
}

/**
 * Format a user mention for storage
 * Converts "John Doe" + "user123" -> "@[John Doe](user123)"
 */
export function formatMention(userName: string, userId: string): string {
  return `@[${userName}](${userId})`;
}

/**
 * Replace plain @mentions with formatted mentions
 * Used when autocompleting
 */
export function replaceMentionInText(
  text: string,
  mentionText: string,
  userName: string,
  userId: string
): string {
  const formatted = formatMention(userName, userId);
  // Replace the mention text (e.g., "@john") with formatted version
  return text.replace(new RegExp(mentionText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), formatted);
}

/**
 * Convert stored mentions to display format for rendering
 * @[John Doe](user123) -> <span class="mention">@John Doe</span>
 */
export function renderMentionsToHTML(content: string, currentUserId?: string): string {
  let rendered = content;

  // Render @all
  rendered = rendered.replace(
    /@all\b/gi,
    '<span class="mention mention-all">@all</span>'
  );

  // Render user mentions
  rendered = rendered.replace(
    /@\[([^\]]+)\]\(([^)]+)\)/g,
    (match, userName, userId) => {
      const isCurrentUser = currentUserId && userId === currentUserId;
      const className = isCurrentUser ? "mention mention-self" : "mention";
      return `<span class="${className}" data-user-id="${userId}">@${userName}</span>`;
    }
  );

  return rendered;
}

/**
 * Get display text for mentions (strip out the userId part)
 * @[John Doe](user123) -> @John Doe
 */
export function getDisplayText(content: string): string {
  return content.replace(/@\[([^\]]+)\]\([^)]+\)/g, "@$1");
}

/**
 * Find mention trigger position in text
 * Returns the position of @ if cursor is right after it or typing a mention
 */
export function findMentionTrigger(text: string, cursorPosition: number): number | null {
  // Look backwards from cursor to find @ symbol
  for (let i = cursorPosition - 1; i >= 0; i--) {
    const char = text[i];

    if (char === "@") {
      // Check if there's a space or it's the start of text
      if (i === 0 || text[i - 1] === " " || text[i - 1] === "\n") {
        return i;
      }
      return null;
    }

    // Stop if we hit a space or newline
    if (char === " " || char === "\n") {
      return null;
    }
  }

  return null;
}

/**
 * Get the search query for mention autocomplete
 */
export function getMentionQuery(text: string, triggerPosition: number, cursorPosition: number): string {
  return text.substring(triggerPosition + 1, cursorPosition);
}
