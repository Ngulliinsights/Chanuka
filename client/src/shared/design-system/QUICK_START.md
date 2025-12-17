# Design System Quick Start

Get started using the Chanuka design system in 5 minutes.

---

## 1️⃣ Import What You Need

```typescript
import { 
  useBrandVoice,      // Get UI text and tone
  useLanguage,        // Handle localization
  useLowBandwidth,    // Detect network speed
  FormattedNumber,    // Format numbers correctly
  FormattedDate,      // Format dates correctly
  FormattedCurrency,  // Format money correctly
} from '@shared/design-system';
```

---

## 2️⃣ Use Brand Voice (Text)

### Get UI Text
```typescript
function SaveButton() {
  const { getMicrocopy } = useBrandVoice();
  return <button>{getMicrocopy('buttons.primary.save')}</button>;
  // Output: "Keep This Close" instead of "Save"
}
```

### Get Tone for Context
```typescript
function ErrorMessage({ message }) {
  const { getTone } = useBrandVoice();
  const tone = getTone('error');
  // tone.voice = "clear, specific, actionable"
  // tone.emoji = "⚠️"
  // tone.audience = "frustrated user trying to succeed"
  
  return (
    <div className={`tone-${tone.emoji}`}>
      {message}
    </div>
  );
}
```

### Available Microcopy Paths
```
buttons.primary.*           // Primary actions
buttons.secondary.*         // Secondary actions
empty_states.*              // No data screens
error_messages.*            // Error communications
form_labels.*               // Form field labels
form_help_text.*            // Supporting text
```

---

## 3️⃣ Use Multilingual Support

### Get Current Language
```typescript
function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();
  
  return (
    <>
      <p>Current: {language}</p>
      <button onClick={() => setLanguage('en')}>English</button>
      <button onClick={() => setLanguage('sw')}>Kiswahili</button>
    </>
  );
}
```

### Format Numbers
```typescript
function BudgetDisplay({ amount }) {
  return (
    <div>
      Budget: <FormattedNumber value={amount} decimals={2} />
    </div>
  );
  // Output in en: "Budget: 1,234,567.00"
  // Output in sw: "Budget: 1 234 567,00"
}
```

### Format Dates
```typescript
function LastUpdated({ date }) {
  return (
    <p>Last updated: <FormattedDate date={date} /></p>
  );
  // Output in en: "Last updated: December 17, 2025"
  // Output in sw: "Last updated: 17 Disemba 2025"
}
```

### Format Currency
```typescript
function PriceTag({ price }) {
  return (
    <p>Price: <FormattedCurrency value={price} currency="KES" /></p>
  );
  // Output in en: "Price: KES 1,000"
  // Output in sw: "Price: KES 1 000"
}
```

---

## 4️⃣ Use Network-Aware Rendering

### Check Network Speed
```typescript
function GalleryComponent() {
  const { isLowBandwidth, networkSpeed } = useLowBandwidth();
  
  if (isLowBandwidth) {
    return <SimplifiedGallery />;
  }
  
  return <FullFeaturedGallery />;
}
```

### Available Network States
```typescript
const {
  isLowBandwidth,    // bool: true if 2G/3G or data saver
  networkSpeed,      // string: '2g' | '3g' | '4g' | 'unknown'
  dataSaverEnabled,  // bool: user has enabled data saver
  isOffline,         // bool: no internet connection
} = useLowBandwidth();
```

### Conditional Components
```typescript
import { ConditionalBandwidth } from '@shared/design-system';

function SmartImage() {
  return (
    <ConditionalBandwidth
      highBandwidth={<img src="high-res.jpg" alt="Photo" />}
      lowBandwidth={<img src="thumbnail.jpg" alt="Photo" />}
    />
  );
}
```

---

## 5️⃣ Common Patterns

### Pattern: Error Message with Tone
```typescript
function FormField({ value, error }) {
  const { getMicrocopy, getTone } = useBrandVoice();
  
  if (error) {
    const errorTone = getTone('error');
    return (
      <>
        <label>{getMicrocopy('form_labels.email')}</label>
        <input value={value} />
        <span role="alert" className="error">
          {getMicrocopy('error_messages.validation.email')}
        </span>
      </>
    );
  }
  
  return (
    <>
      <label>{getMicrocopy('form_labels.email')}</label>
      <input value={value} />
    </>
  );
}
```

### Pattern: Multi-language Budget Display
```typescript
function BudgetWidget({ total, breakdown }) {
  const { language, format } = useLanguage();
  
  return (
    <div>
      <h2>{format.pluralize(total, 'shilling')}</h2>
      <p>Total: <FormattedCurrency value={total} currency="KES" /></p>
      
      <ul>
        {breakdown.map(item => (
          <li key={item.id}>
            {item.name}: <FormattedNumber value={item.amount} />
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### Pattern: Network-Optimized Image Gallery
```typescript
function ImageGallery({ images }) {
  const { isLowBandwidth } = useLowBandwidth();
  
  return (
    <div className="gallery">
      {images.map(img => (
        <img
          key={img.id}
          src={isLowBandwidth ? img.thumbnail : img.full}
          alt={img.title}
          loading="lazy"
        />
      ))}
    </div>
  );
}
```

---

## 🎯 Next Steps

1. **Find a component** to update (start with buttons or form fields)
2. **Add imports** for the hooks you need
3. **Replace hardcoded text** with `getMicrocopy()`
4. **Replace hardcoded formatting** with `<FormattedNumber />` etc.
5. **Test** in your browser - it should just work!

---

## 📖 Learn More

- **Full Documentation:** See [INTEGRATION_COMPLETE.md](../shared/design-system/INTEGRATION_COMPLETE.md)
- **Implementation Guide:** See [IMPLEMENTATION_GUIDE.ts](../shared/design-system/IMPLEMENTATION_GUIDE.ts)
- **API Reference:** See JSDoc comments in provider files

---

## 🐛 Troubleshooting

**"Cannot find module"**
- Make sure you imported from `@shared/design-system`
- Check that AppProviders wraps your component

**"Hook returned undefined"**
- Make sure your component is inside ChanukaProviders
- Check browser console for initialization errors

**"Language didn't change"**
- Make sure you called `setLanguage()` in the same component tree
- Verify localStorage is enabled
- Check browser language preference

**"Images not optimizing"**
- Open DevTools → Network → Throttle to "Slow 3G"
- Verify `<ConditionalBandwidth>` or `useLowBandwidth()` is used
- Check console for any errors

---

**Ready? Start updating components! 🚀**
