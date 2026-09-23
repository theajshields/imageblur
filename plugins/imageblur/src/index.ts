import { findByName, findByProps, findByStoreName } from "@vendetta/metro";
import { before } from "@vendetta/patcher";
import { storage } from "@vendetta/plugin";
import Settings from "./Settings";

let patches: (() => void)[] = [];

// Utility to parse comma-separated IDs from settings into an array
const getParsedIds = (idString: string | undefined): string[] => {
  if (!idString) return [];
  return idString.split(",").map((id) => id.trim()).filter(Boolean);
};

// Recursive function to apply spoilers, handling both standard and forwarded messages
function spoilerizeMessage(message: any) {
  if (!message) return;

  // 1. Process direct attachments
  if (message.attachments?.length) {
    for (const attachment of message.attachments) {
      attachment.spoiler = true;
    }
  }

  // 2. Process Forwarded Messages (Message Snapshots)
  if (message.messageSnapshots?.length) {
    for (const snapshot of message.messageSnapshots) {
      if (snapshot.message) {
        spoilerizeMessage(snapshot.message);
      }
    }
  }
}

export default {
  onLoad() {
    const createMessageContent = findByName("createMessageContent", false);
    const UserStore = findByStoreName("UserStore");
    const ChannelStore = findByStoreName("ChannelStore");

    if (!createMessageContent) return;

    patches.push(
      before("default", createMessageContent, (args) => {
        const content = args[0];
        if (!content?.message || !content?.options) return;

        const message = content.message;
        const authorId = message?.author?.id;
        const channelId = message?.channel_id;
        
        const channel = ChannelStore?.getChannel(channelId);
        const guildId = channel?.guild_id;
        const myUserId = UserStore?.getCurrentUser()?.id;

        // Settings Check 1: Exclude self-sent messages if spoilerOwn is disabled
        if (!storage.spoilerOwn && authorId && myUserId && authorId === myUserId) {
          return args;
        }

        // Settings Check 2: Parse filtering lists
        const users = getParsedIds(storage.userIds);
        const channels = getParsedIds(storage.channelIds);
        const guilds = getParsedIds(storage.guildIds);

        const isUserMatch = authorId ? users.includes(authorId) : false;
        const isChannelMatch = channelId ? channels.includes(channelId) : false;
        const isGuildMatch = guildId ? guilds.includes(guildId) : false;

        const isMatched = isUserMatch || isChannelMatch || isGuildMatch;

        // FILTERING LOGIC FIX:
        if (storage.isWhitelist) {
          // Whitelist Mode: ONLY blur if an ID matches one of the user's whitelist inputs
          if (!isMatched) return args;
        } else {
          // Blacklist Mode: Blur EVERYTHING EXCEPT when an ID matches the blacklist
          if (isMatched) return args;
        }

        // Apply visual render flags to enforce obscuring
        content.options.inlineEmbedMedia = false;
        content.options.shouldObscureSpoiler = true;

        // Apply spoiler flags to attachments recursively
        spoilerizeMessage(message);

        return args;
      })
    );

    // Re-render currently visible messages
    this.refreshCurrentChannel();
  },

  refreshCurrentChannel() {
    try {
      const SelectedChannelStore = findByStoreName("SelectedChannelStore");
      const FluxDispatcher = findByProps("dispatch", "subscribe");

      const channelId = SelectedChannelStore?.getChannelId();
      if (channelId && FluxDispatcher) {
        FluxDispatcher.dispatch({
          type: "CHANNEL_SELECT",
          channelId: channelId,
        });
      }
    } catch (e) {
      // Fail silently if stores aren't perfectly mapped on a specific client build
    }
  },

  onUnload() {
    for (const unpatch of patches) unpatch?.();
    patches = [];

    // Refresh again to instantly remove spoilers when the plugin is turned off
    this.refreshCurrentChannel();
  },

  settings: Settings,
};