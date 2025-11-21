export interface TemplateMetadata {
  id: string;
  name: string;
  description: string;
  category: 'traditional' | 'modern' | 'creative' | 'functional' | 'executive';
  bestFor: string[];
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  fileName: string;
  previewImage?: string;
  features: string[];
}

export const CV_TEMPLATES: Record<string, TemplateMetadata> = {
  modern: {
    id: 'modern',
    name: 'Modern Professional',
    description: 'Clean, contemporary design with a professional sidebar layout',
    category: 'modern',
    bestFor: ['IT', 'Engineering', 'Business', 'Sales', 'General'],
    colors: {
      primary: '#667eea',
      secondary: '#764ba2',
      accent: '#4299e1',
    },
    fileName: 'modern.hbs',
    features: [
      'Two-column layout',
      'Gradient sidebar',
      'Professional color scheme',
      'ATS-friendly',
    ],
  },

  classic: {
    id: 'classic',
    name: 'Classic Professional',
    description: 'Traditional, elegant design perfect for conservative industries',
    category: 'traditional',
    bestFor: ['Banking', 'Law', 'Government', 'Academia', 'Healthcare'],
    colors: {
      primary: '#2c3e50',
      secondary: '#34495e',
      accent: '#3498db',
    },
    fileName: 'classic.hbs',
    features: [
      'Single-column layout',
      'Traditional formatting',
      'Serif typography',
      'Conservative design',
    ],
  },

  creative: {
    id: 'creative',
    name: 'Creative Bold',
    description: 'Vibrant, eye-catching design for creative professionals',
    category: 'creative',
    bestFor: ['Design', 'Marketing', 'Media', 'Arts', 'Photography'],
    colors: {
      primary: '#e74c3c',
      secondary: '#c0392b',
      accent: '#f39c12',
    },
    fileName: 'creative.hbs',
    features: [
      'Bold color scheme',
      'Visual hierarchy',
      'Modern typography',
      'Stand-out design',
    ],
  },

  functional: {
    id: 'functional',
    name: 'Skills-Focused',
    description: 'Emphasizes skills and competencies over work history',
    category: 'functional',
    bestFor: ['Career changers', 'Recent graduates', 'Freelancers', 'Consultants'],
    colors: {
      primary: '#16a085',
      secondary: '#1abc9c',
      accent: '#27ae60',
    },
    fileName: 'functional.hbs',
    features: [
      'Skills-first layout',
      'Competency-based',
      'De-emphasizes dates',
      'Great for career transitions',
    ],
  },

  executive: {
    id: 'executive',
    name: 'Executive Elite',
    description: 'Sophisticated design for senior leadership positions',
    category: 'executive',
    bestFor: ['C-Suite', 'Directors', 'VP', 'Senior Management'],
    colors: {
      primary: '#1a1a2e',
      secondary: '#16213e',
      accent: '#0f3460',
    },
    fileName: 'executive.hbs',
    features: [
      'Prestigious appearance',
      'Leadership-focused',
      'Professional gravitas',
      'Executive summary prominent',
    ],
  },

  minimalist: {
    id: 'minimalist',
    name: 'Minimalist Clean',
    description: 'Simple, uncluttered design that lets content shine',
    category: 'modern',
    bestFor: ['Tech', 'Startups', 'Consulting', 'Finance'],
    colors: {
      primary: '#2d3748',
      secondary: '#4a5568',
      accent: '#718096',
    },
    fileName: 'minimalist.hbs',
    features: [
      'Clean lines',
      'Plenty of white space',
      'Subtle accents',
      'Content-focused',
    ],
  },

  'corporate-blue': {
    id: 'corporate-blue',
    name: 'Corporate Blue',
    description: 'Professional two-column design with elegant blue sidebar',
    category: 'modern',
    bestFor: ['Marketing', 'Business', 'Sales', 'Management', 'Corporate'],
    colors: {
      primary: '#5a6696',
      secondary: '#2c3e50',
      accent: '#4a5680',
    },
    fileName: 'corporate-blue.hbs',
    features: [
      'Two-column layout',
      'Blue sidebar design',
      'Professional appearance',
      'Contact info highlighted',
    ],
  },

  'academic-minimal': {
    id: 'academic-minimal',
    name: 'Academic Minimal',
    description: 'Clean academic-style CV with serif typography and two-column layout',
    category: 'traditional',
    bestFor: ['Academia', 'Research', 'Education', 'Science', 'Publications'],
    colors: {
      primary: '#2d3748',
      secondary: '#4a5568',
      accent: '#31e',
    },
    fileName: 'academic-minimal.hbs',
    features: [
      'Serif typography',
      'Two-column layout',
      'A4 optimized',
      'Print-friendly',
    ],
  },

  'professional-modern': {
    id: 'professional-modern',
    name: 'Professional Modern',
    description: 'Modern two-column design with blue sidebar and comprehensive sections',
    category: 'modern',
    bestFor: ['IT', 'Engineering', 'Development', 'Tech', 'Software'],
    colors: {
      primary: '#2c3e50',
      secondary: '#3498db',
      accent: '#4299e1',
    },
    fileName: 'professional-modern.hbs',
    features: [
      'Two-column layout',
      'Blue sidebar accent',
      'Detailed sections',
      'Skills highlighted',
    ],
  },

  'vibrant-professional': {
    id: 'vibrant-professional',
    name: 'Vibrant Professional',
    description: 'Eye-catching design with dark blue sidebar and vibrant cyan accents',
    category: 'creative',
    bestFor: ['Creative', 'Marketing', 'Design', 'Media', 'Communications'],
    colors: {
      primary: '#1e3a5f',
      secondary: '#4dd9d9',
      accent: '#2a5080',
    },
    fileName: 'vibrant-professional.hbs',
    features: [
      'Photo-friendly design',
      'Bold color scheme',
      'Two-column layout',
      'Modern and professional',
    ],
  },
};

export function getTemplateById(templateId: string): TemplateMetadata | undefined {
  return CV_TEMPLATES[templateId];
}

export function getTemplatesByCategory(category: string): TemplateMetadata[] {
  return Object.values(CV_TEMPLATES).filter((t) => t.category === category);
}

export function getAllTemplates(): TemplateMetadata[] {
  return Object.values(CV_TEMPLATES);
}

export function recommendTemplates(profession?: string): TemplateMetadata[] {
  if (!profession) {
    return [CV_TEMPLATES.modern, CV_TEMPLATES.classic];
  }

  const professionLower = profession.toLowerCase();

  // Match profession to template recommendations
  return Object.values(CV_TEMPLATES).filter((template) =>
    template.bestFor.some((field) =>
      professionLower.includes(field.toLowerCase()) ||
      field.toLowerCase().includes(professionLower)
    )
  );
}
