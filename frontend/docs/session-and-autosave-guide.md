# Session Timeout & Form Auto-Save Guide

## Overview

The application now has improved timeout handling and automatic form backup to prevent data loss:

### Session Configuration

- **JWT Token Expiration**: 8 hours
- **API Request Timeout**: 2 minutes (120 seconds)
- **Auto-Save Frequency**: Every 2 seconds (debounced)

This means:
✅ You can work for up to 4 hours without being logged out
✅ Long operations (creating projects, generating reports) won't timeout
✅ Form data is automatically saved to prevent loss

---

## How Auto-Save Works

### Automatic Features

1. **Local Storage Backup**: Form data is saved to your browser's localStorage every 2 seconds
2. **Session Recovery**: If your session expires, you can restore your work when you log back in
3. **Crash Recovery**: Even if your browser crashes, your form data is preserved
4. **Old Data Cleanup**: Auto-saves older than 7 days are automatically removed

### For Users

When creating a project or filling out a long form:

1. **Data is automatically saved** as you type (you'll see console logs: `[AutoSave] Saved form data`)
2. **If session expires**, log back in and navigate to the same form
3. **You'll be prompted**: "Restore previous draft?" - click Yes to recover your work
4. **After submitting successfully**, the auto-save is cleared

---

## For Developers: How to Use Auto-Save

### Basic Usage in a Form Component

```tsx
import { useFormAutoSave } from '../lib/formAutoSave';

function CreateProjectForm() {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    budget: 0,
    // ... other fields
  });

  // Initialize auto-save with unique key
  const { autoSave, restoreData, clearData } = useFormAutoSave('create-project-form');

  // Restore on mount
  useEffect(() => {
    const restored = restoreData();
    if (restored) {
      const shouldRestore = confirm('Found unsaved draft. Restore it?');
      if (shouldRestore) {
        setFormData(restored);
      } else {
        clearData(); // User declined, clear the old data
      }
    }
  }, []);

  // Auto-save on every change
  const handleChange = (field: string, value: any) => {
    const updated = { ...formData, [field]: value };
    setFormData(updated);
    autoSave(updated); // Automatically saves after 2 seconds
  };

  // Clear after successful submit
  const handleSubmit = async () => {
    try {
      await api.post('/projects', formData);
      clearData(); // Clear auto-save after success
      toast.success('Project created successfully!');
    } catch (error) {
      toast.error('Failed to create project');
      // Auto-save is preserved if submission fails
    }
  };

  return (
    <form>
      <input
        value={formData.name}
        onChange={(e) => handleChange('name', e.target.value)}
        placeholder="Project Name"
      />
      {/* ... other fields */}
      <button onClick={handleSubmit}>Create Project</button>
    </form>
  );
}
```

### Advanced Configuration

```tsx
const { autoSave, restoreData, clearData } = useFormAutoSave('my-form', {
  debounceMs: 3000, // Save after 3 seconds instead of 2
  onSave: (data) => {
    console.log('Data saved!', data);
    toast.info('Draft saved');
  },
  onRestore: (data) => {
    console.log('Data restored!', data);
    toast.success('Draft restored');
  },
});
```

### Manual Control (Without Hook)

```tsx
import { formAutoSave } from '../lib/formAutoSave';

// Save manually
formAutoSave.save('my-unique-key', formData, 1000);

// Restore manually
const restored = formAutoSave.restore('my-unique-key', 24 * 60 * 60 * 1000); // 24 hours max age

// Clear manually
formAutoSave.clear('my-unique-key');

// List all saved forms
const savedForms = formAutoSave.listSaved();
console.log('Saved forms:', savedForms);

// Clear old saves (older than 7 days)
formAutoSave.clearOld(7 * 24 * 60 * 60 * 1000);
```

---

## Security Considerations

### What is Saved?
- ✅ Form field values (text, numbers, selections)
- ✅ Timestamps for age validation
- ❌ **NOT saved**: Passwords, tokens, or sensitive authentication data

### Where is it Saved?
- **localStorage** in the user's browser
- Data never leaves the user's computer
- Cleared when user clears browser data

### Best Practices

1. **Use unique keys** for each form to prevent conflicts
2. **Clear on successful submit** to avoid outdated data
3. **Don't auto-save passwords** - exclude sensitive fields
4. **Validate restored data** before using it

Example of excluding password field:

```tsx
const handleChange = (field: string, value: any) => {
  const updated = { ...formData, [field]: value };
  setFormData(updated);
  
  // Create a copy without sensitive data
  const { password, confirmPassword, ...safeData } = updated;
  autoSave(safeData); // Only save non-sensitive fields
};
```

---

## Which Forms Should Use Auto-Save?

### ✅ Use Auto-Save For:
- **Project Creation Forms** (long, complex)
- **Budget Draft Forms** (multiple fields, calculations)
- **Report Configuration** (many options)
- **User Settings** (preferences)
- **Search Filters** (for user convenience)

### ❌ Don't Use Auto-Save For:
- **Login Forms** (security risk)
- **Password Change Forms** (security risk)
- **Payment Forms** (PCI compliance)
- **Very simple forms** (single field, quick submit)
- **OTP/2FA Forms** (expire quickly anyway)

---

## Troubleshooting

### "Restore previous draft?" doesn't appear

Check:
1. Did you properly initialize `useFormAutoSave` hook?
2. Is the key unique and consistent?
3. Check browser console for `[AutoSave]` logs
4. Verify localStorage isn't disabled

### Auto-save not working

Check browser console:
- Should see: `[AutoSave] Saved form data for key: your-key`
- If you see errors, check if localStorage is available
- Verify you're calling `autoSave(data)` on form changes

### Old drafts keep appearing

```tsx
// Clear specific form
formAutoSave.clear('your-form-key');

// Clear all old auto-saves
formAutoSave.clearOld(0); // Clear everything
```

---

## Future Enhancements

Possible improvements:
1. **Cloud Sync**: Save drafts to server for multi-device access
2. **Version History**: Keep multiple versions of drafts
3. **Conflict Resolution**: Handle concurrent edits
4. **Compression**: Compress large form data
5. **Encryption**: Encrypt sensitive form data

---

## Summary

### What Changed?

1. **API Timeout**: 25s → 120s (2 minutes)
2. **JWT Expiration**: 1 hour → 8 hours
3. **Auto-Save**: New feature - automatic localStorage backup

### Impact on User Experience

| Before | After |
|--------|-------|
| Timeout after 25 seconds | Timeout after 2 minutes |
| Logged out after 1 hour | Logged out after 8 hours |
| Lost form data on timeout | Auto-recovers form data |
| Had to rush through forms | Can work at your own pace |

### Security vs. Usability

The changes strike a balance:
- **8-hour sessions** are industry-standard (Google, Microsoft, AWS use 8-12 hours)
- **2-minute timeouts** prevent server hangs while allowing complex operations
- **localStorage auto-save** is local-only, doesn't expose data to network

---

## Questions?

If you have questions about implementing auto-save in your forms, refer to the code examples above or check the source: `frontend/lib/formAutoSave.ts`
