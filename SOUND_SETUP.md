# 🔊 Notification Sound Setup & Troubleshooting

## ✅ Sound File Added

A notification sound has been downloaded and placed at:
```
public/sounds/notification.mp3
```

## 🧪 Testing the Sound

### Method 1: Test Button (Added to Topbar)
1. Start your dev server: `npm run dev`
2. Open the app in your browser
3. Look for the **"Test Sound"** button in the top right (next to the bell icon)
4. Click it to test the sound
5. If you see "(Click to enable)", click it once to unlock audio

### Method 2: Real Notification Test
1. Log in as **User A** (e.g., admin)
2. Create a task and assign it to **User B** (another user)
3. Log out and log in as **User B**
4. You should:
   - See the bell icon with a badge (1)
   - Hear the notification sound 🔊
   - See the notification in the dropdown

## 🔍 Troubleshooting

### Issue: No sound plays at all

**Possible causes:**

1. **Browser autoplay policy blocked it**
   - **Solution**: Click anywhere on the page first, then wait for a notification
   - Modern browsers block autoplay until user interacts with the page
   - The "Test Sound" button helps unlock audio

2. **Volume is muted**
   - Check your system volume
   - Check browser tab is not muted (look for 🔇 icon on tab)

3. **Browser console shows errors**
   - Open DevTools (F12)
   - Check Console tab for errors
   - Look for messages about audio loading

### Issue: Sound plays on page load

**Fix**: This is normal behavior for testing audio permissions. The hook tries to play once silently to check if it's allowed.

### Issue: Sound doesn't play on first notification

**Fix**: Click the "Test Sound" button once after page load. This unlocks audio for the session.

## 🎵 Customizing the Sound

### Replace with your own sound:

1. Find or create an MP3 file (0.5-1 second duration recommended)
2. Replace `public/sounds/notification.mp3` with your file
3. Restart dev server
4. Test with the "Test Sound" button

### Recommended sound sources:
- https://mixkit.co/free-sound-effects/notification/
- https://notificationsounds.com/
- https://freesound.org/

### Sound requirements:
- Format: MP3, WAV, or OGG
- Duration: 0.5-1 second (short and pleasant)
- Volume: Medium (not too loud)
- Quality: Clear, professional sound

## 🔧 Debug Mode

The sound hook logs to console. Check DevTools for:
- `✓ Loaded custom notification sound` - Sound file loaded successfully
- `ℹ Using fallback notification sound` - MP3 not found, using embedded sound
- `🔔 New notification! Count: 0 → 1` - Notification received, sound should play
- `Failed to play notification sound: ...` - Error playing sound

## 🚀 Production Deployment

### Before deploying:

1. ✅ Sound file exists at `public/sounds/notification.mp3`
2. ✅ Test sound works in development
3. ✅ Remove the test button (see below)

### Remove test button for production:

Edit `src/components/layout/topbar.tsx`:

```diff
- import { NotificationSoundTest } from "./notification-sound-test";

  <div className="flex items-center gap-3">
-   <NotificationSoundTest />
    <NotificationBell />
    <DropdownMenu>
```

## 📊 Current Sound Details

- **File**: `public/sounds/notification.mp3`
- **Size**: 13KB
- **Format**: MP3
- **Source**: Mixkit (free, royalty-free)
- **Volume**: 50% (configurable in hook)

## 🎯 How It Works

1. **Page loads** → Sound hook initializes
2. **User clicks anywhere** → Audio unlocked (browser requirement)
3. **Polling** → Checks for new notifications every 30 seconds
4. **Unread count increases** → Sound plays automatically
5. **Debounce** → Prevents duplicate sounds (2-second cooldown)

## 💡 Tips

- **First visit**: Click "Test Sound" button to unlock audio
- **Browser tab inactive**: Sound still plays (not muted)
- **Multiple tabs**: Each tab plays independently
- **Mobile**: Some mobile browsers require user interaction first
- **Headphones**: Make sure headphones are connected and volume is up

---

## 🐛 Still Not Working?

1. Check browser console (F12) for errors
2. Verify file exists: `ls -la public/sounds/notification.mp3`
3. Try a different browser (Chrome, Firefox, Safari)
4. Test with browser DevTools open
5. Check if other audio works on the page

If sound still doesn't work, it's likely a browser autoplay restriction. The user must interact with the page first (click, type, etc.) before audio can play.

This is a **browser security feature** and affects all websites, not just yours.

---

**Your notification sound system is ready!** 🎉
