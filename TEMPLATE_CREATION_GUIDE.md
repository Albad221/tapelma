# Template Creation Guide for SamaCV

## Creating a New Template

### Step 1: Create the Template File

Create a new `.hbs` file in `src/modules/pdf/templates/`:

```bash
# Example: Creating a "compact" template
touch src/modules/pdf/templates/compact.hbs
```

### Step 2: Build Your Template

Use this starter template structure:

```handlebars
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{personalInfo.fullName}} - CV</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Arial', sans-serif;
            color: #333;
            line-height: 1.6;
            background: #ffffff;
            padding: 40px;
        }

        /* Add your custom styles here */
        .header {
            margin-bottom: 30px;
        }

        h1 {
            font-size: 32px;
            color: #000;
        }

        .section {
            margin-bottom: 25px;
        }

        .section-title {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 15px;
            border-bottom: 2px solid #000;
            padding-bottom: 5px;
        }
    </style>
</head>
<body>
    <!-- Header -->
    <div class="header">
        <h1>{{personalInfo.fullName}}</h1>
        <p>{{personalInfo.email}} | {{personalInfo.phone}}</p>
    </div>

    <!-- Summary -->
    {{#if personalInfo.summary}}
    <div class="section">
        <h2 class="section-title">Summary</h2>
        <p>{{personalInfo.summary}}</p>
    </div>
    {{/if}}

    <!-- Work Experience -->
    {{#if hasWorkExperience}}
    <div class="section">
        <h2 class="section-title">Experience</h2>
        {{#each workExperiences}}
        <div class="experience-item">
            <h3>{{this.position}} - {{this.companyName}}</h3>
            <p class="duration">{{this.duration}}</p>
            <p>{{this.description}}</p>
        </div>
        {{/each}}
    </div>
    {{/if}}

    <!-- Education -->
    {{#if hasEducation}}
    <div class="section">
        <h2 class="section-title">Education</h2>
        {{#each education}}
        <div class="education-item">
            <h3>{{this.degreeField}}</h3>
            <p>{{this.institution}} - {{this.duration}}</p>
        </div>
        {{/each}}
    </div>
    {{/if}}

    <!-- Skills -->
    {{#if hasSkills}}
    <div class="section">
        <h2 class="section-title">Skills</h2>
        {{#each skills}}
        <span class="skill">{{this.name}}</span>
        {{/each}}
    </div>
    {{/if}}
</body>
</html>
```

### Step 3: Register in Template Registry

Add your template to `src/modules/pdf/templates/template-registry.ts`:

```typescript
export const CV_TEMPLATES: Record<string, TemplateMetadata> = {
  // ... existing templates ...

  compact: {
    id: 'compact',
    name: 'Compact Professional',
    description: 'Space-efficient design that fits more content on one page',
    category: 'modern', // or 'traditional', 'creative', 'functional', 'executive'
    bestFor: ['Students', 'Entry-level', 'Career changers'],
    colors: {
      primary: '#2c3e50',
      secondary: '#34495e',
      accent: '#3498db',
    },
    fileName: 'compact.hbs',
    features: [
      'Fits more content',
      'Clean and organized',
      'Professional appearance',
      'Easy to scan',
    ],
  },
};
```

### Step 4: Rebuild and Test

```bash
# Rebuild the application
npm run build

# Restart dev server (if running)
# The server will automatically detect the new template
```

### Step 5: Test Your Template

1. Visit http://localhost:3000/templates.html
2. Your new template should appear in the gallery
3. Click "Preview" to test with sample data
4. Adjust CSS/HTML as needed

## Available Data Structure

```typescript
{
  personalInfo: {
    firstName: string;
    lastName: string;
    fullName: string;  // Auto-generated: "firstName lastName"
    email: string;
    phone: string;
    location: string;  // Auto-generated: "city, country"
    linkedIn: string;
    portfolio: string;
    summary: string;
  },

  workExperiences: Array<{
    companyName: string;
    position: string;
    startDate: string;
    endDate: string;
    isCurrent: boolean;
    location: string;
    description: string;
    duration: string;  // Auto-generated: "startDate - endDate"
  }>,

  education: Array<{
    institution: string;
    degree: string;
    fieldOfStudy: string;
    degreeField: string;  // Auto-generated: "degree in fieldOfStudy"
    startDate: string;
    endDate: string;
    isCurrent: boolean;
    gpa: string;
    description: string;
    duration: string;  // Auto-generated
  }>,

  skills: Array<{
    name: string;
  }>,

  languages: Array<{
    name: string;
    proficiency: string;
  }>,

  certifications: Array<{
    name: string;
    issuingOrganization: string;
    issueDate: string;
    expiryDate: string;
    duration: string;  // Auto-generated
  }>,

  // Helper flags
  hasWorkExperience: boolean;
  hasEducation: boolean;
  hasSkills: boolean;
  hasLanguages: boolean;
  hasCertifications: boolean;
}
```

## Handlebars Helpers

Available custom helpers:

```handlebars
{{substring personalInfo.firstName 0 1}}  // Returns first character
```

## Design Tips

### 1. **Use Print-Friendly CSS**
```css
body {
    background: #ffffff;  /* White background */
    color: #000000;       /* Black text for printing */
}

@page {
    size: A4;
    margin: 0;
}
```

### 2. **Avoid Page Breaks in Items**
```css
.experience-item, .education-item {
    page-break-inside: avoid;
}
```

### 3. **Use PDF-Safe Fonts**
```css
font-family: 'Arial', 'Helvetica', 'Times New Roman', 'Georgia', sans-serif;
```

### 4. **Keep File Size Small**
- Don't use external images
- Keep CSS inline
- Minimize JavaScript (Handlebars only)

### 5. **Test Responsiveness**
- Test with different amounts of data
- Ensure layout doesn't break with long text
- Check with empty sections

## Template Categories

Choose the right category for your template:

- **modern**: Contemporary, clean designs
- **traditional**: Classic, conservative layouts
- **creative**: Bold, artistic designs
- **functional**: Skills-focused layouts
- **executive**: Sophisticated, leadership-focused

## Common Patterns

### Two-Column Layout
```css
.container {
    display: flex;
}
.sidebar {
    width: 35%;
}
.main-content {
    width: 65%;
}
```

### Single Column with Sections
```css
.section {
    margin-bottom: 30px;
}
```

### Grid Layout for Skills
```css
.skills-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
}
```

## Example: Quick Template

Here's a complete minimal template:

```handlebars
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>{{personalInfo.fullName}} - CV</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; padding: 30px; line-height: 1.5; }
        h1 { font-size: 28px; margin-bottom: 5px; }
        .contact { font-size: 12px; color: #666; margin-bottom: 20px; }
        .section { margin-bottom: 20px; }
        .section-title { font-size: 16px; font-weight: bold; border-bottom: 1px solid #000; margin-bottom: 10px; }
        .item { margin-bottom: 15px; }
        .item-title { font-weight: bold; }
        .item-subtitle { color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <h1>{{personalInfo.fullName}}</h1>
    <div class="contact">{{personalInfo.email}} • {{personalInfo.phone}}</div>

    {{#if personalInfo.summary}}
    <div class="section">
        <div class="section-title">SUMMARY</div>
        <p>{{personalInfo.summary}}</p>
    </div>
    {{/if}}

    {{#if hasWorkExperience}}
    <div class="section">
        <div class="section-title">EXPERIENCE</div>
        {{#each workExperiences}}
        <div class="item">
            <div class="item-title">{{this.position}}</div>
            <div class="item-subtitle">{{this.companyName}} | {{this.duration}}</div>
            <p>{{this.description}}</p>
        </div>
        {{/each}}
    </div>
    {{/if}}

    {{#if hasEducation}}
    <div class="section">
        <div class="section-title">EDUCATION</div>
        {{#each education}}
        <div class="item">
            <div class="item-title">{{this.degreeField}}</div>
            <div class="item-subtitle">{{this.institution}} | {{this.duration}}</div>
        </div>
        {{/each}}
    </div>
    {{/if}}

    {{#if hasSkills}}
    <div class="section">
        <div class="section-title">SKILLS</div>
        <p>{{#each skills}}{{this.name}}{{#unless @last}}, {{/unless}}{{/each}}</p>
    </div>
    {{/if}}
</body>
</html>
```

## Need Help?

- Look at existing templates in `src/modules/pdf/templates/` for examples
- Test frequently using the preview feature
- Use Chrome DevTools to inspect the PDF output
- Check Handlebars documentation: https://handlebarsjs.com/

Happy template creating! 🎨
