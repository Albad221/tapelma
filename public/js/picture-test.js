// Picture Test Interface JavaScript
document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const uploadZone = document.getElementById('uploadZone');
    const imageInput = document.getElementById('imageInput');
    const previewContainer = document.getElementById('previewContainer');
    const imagePreview = document.getElementById('imagePreview');
    const changeImageBtn = document.getElementById('changeImageBtn');
    const jobDescription = document.getElementById('jobDescription');
    const analyzeBtn = document.getElementById('analyzeBtn');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const loadingText = document.getElementById('loadingText');
    const analysisCard = document.getElementById('analysisCard');
    const analysisResult = document.getElementById('analysisResult');
    const generatedCard = document.getElementById('generatedCard');
    const generatedImage = document.getElementById('generatedImage');
    const comparisonCard = document.getElementById('comparisonCard');
    const comparisonOriginal = document.getElementById('comparisonOriginal');
    const comparisonGenerated = document.getElementById('comparisonGenerated');
    const downloadBtn = document.getElementById('downloadBtn');

    // State
    let currentImageBase64 = null;
    let generatedImageBase64 = null;

    // Get selected language
    const getSelectedLanguage = () => {
        const selectedRadio = document.querySelector('input[name="language"]:checked');
        return selectedRadio ? selectedRadio.value : 'fr';
    };

    // Upload Zone Click Handler
    uploadZone.addEventListener('click', () => {
        imageInput.click();
    });

    // Drag and Drop Handlers
    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('drag-over');
    });

    uploadZone.addEventListener('dragleave', () => {
        uploadZone.classList.remove('drag-over');
    });

    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('drag-over');

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileSelect(files[0]);
        }
    });

    // File Input Change Handler
    imageInput.addEventListener('change', (e) => {
        const files = e.target.files;
        if (files.length > 0) {
            handleFileSelect(files[0]);
        }
    });

    // Change Image Button Handler
    changeImageBtn.addEventListener('click', () => {
        imageInput.click();
    });

    // Analyze Button Handler
    analyzeBtn.addEventListener('click', async () => {
        await analyzeAndGenerate();
    });

    // Download Button Handler
    downloadBtn.addEventListener('click', () => {
        if (generatedImageBase64) {
            const link = document.createElement('a');
            link.href = `data:image/jpeg;base64,${generatedImageBase64}`;
            link.download = `cv-picture-professional-${Date.now()}.jpg`;
            link.click();
        }
    });

    // Handle File Selection
    const handleFileSelect = (file) => {
        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert(getSelectedLanguage() === 'fr'
                ? 'Veuillez sélectionner une image (JPG, PNG, etc.)'
                : 'Please select an image (JPG, PNG, etc.)');
            return;
        }

        // Validate file size (5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert(getSelectedLanguage() === 'fr'
                ? 'L\'image est trop grande. Maximum 5MB.'
                : 'Image is too large. Maximum 5MB.');
            return;
        }

        // Read file and convert to base64
        const reader = new FileReader();
        reader.onload = (e) => {
            const base64String = e.target.result.split(',')[1];
            currentImageBase64 = base64String;

            // Show preview
            imagePreview.src = e.target.result;
            uploadZone.classList.add('hidden');
            previewContainer.classList.remove('hidden');
            analyzeBtn.disabled = false;

            // Hide previous results
            analysisCard.classList.add('hidden');
            generatedCard.classList.add('hidden');
            comparisonCard.classList.add('hidden');
        };
        reader.readAsDataURL(file);
    };

    // Show Loading
    const showLoading = (message) => {
        loadingText.textContent = message;
        loadingOverlay.classList.remove('hidden');
    };

    // Hide Loading
    const hideLoading = () => {
        loadingOverlay.classList.add('hidden');
    };

    // Analyze and Generate
    const analyzeAndGenerate = async () => {
        if (!currentImageBase64) {
            return;
        }

        const language = getSelectedLanguage();
        const description = jobDescription.value.trim() || 'professional';

        try {
            // Show loading
            showLoading(language === 'fr'
                ? 'Analyse en cours...'
                : 'Analyzing...');

            // Call analyze-and-generate endpoint
            const response = await fetch('/api/picture-test/analyze-and-generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    imageBase64: currentImageBase64,
                    description: description,
                    language: language,
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            // Hide loading
            hideLoading();

            // Display analysis results
            displayAnalysisResult(result.analysis, language);

            // If image was generated, display it
            if (result.generatedImage) {
                showLoading(language === 'fr'
                    ? 'Génération de la photo professionnelle...'
                    : 'Generating professional photo...');

                // Small delay to show the loading state
                setTimeout(() => {
                    hideLoading();
                    displayGeneratedImage(result.generatedImage);
                    displayComparison(currentImageBase64, result.generatedImage);
                }, 500);
            }

        } catch (error) {
            hideLoading();
            console.error('Error:', error);
            alert(language === 'fr'
                ? 'Une erreur est survenue lors de l\'analyse.'
                : 'An error occurred during analysis.');
        }
    };

    // Display Analysis Result
    const displayAnalysisResult = (analysis, language) => {
        analysisCard.classList.remove('hidden');

        const isSuitable = analysis.isSuitable;
        const reason = analysis.reason;
        const suggestions = analysis.suggestions || [];

        let html = '';

        if (isSuitable) {
            html = `
                <div class="analysis-suitable">
                    <div class="status-icon">✅</div>
                    <div class="analysis-reason">
                        ${language === 'fr' ? '✨ Photo adaptée pour un CV professionnel' : '✨ Photo suitable for a professional CV'}
                    </div>
                    <p>${reason}</p>
                </div>
            `;
        } else {
            html = `
                <div class="analysis-unsuitable">
                    <div class="status-icon">❌</div>
                    <div class="analysis-reason">
                        ${language === 'fr' ? '⚠️ Photo non adaptée pour un CV professionnel' : '⚠️ Photo not suitable for a professional CV'}
                    </div>
                    <p><strong>${language === 'fr' ? 'Raison :' : 'Reason:'}</strong> ${reason}</p>
                    ${suggestions.length > 0 ? `
                        <div class="analysis-suggestions">
                            <h4>${language === 'fr' ? 'Suggestions d\'amélioration :' : 'Improvement suggestions:'}</h4>
                            <ul>
                                ${suggestions.map(s => `<li>${s}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                </div>
            `;
        }

        analysisResult.innerHTML = html;

        // Scroll to results
        analysisCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    };

    // Display Generated Image
    const displayGeneratedImage = (imageBase64) => {
        generatedImageBase64 = imageBase64;
        generatedImage.src = `data:image/jpeg;base64,${imageBase64}`;
        generatedCard.classList.remove('hidden');

        // Scroll to generated image
        setTimeout(() => {
            generatedCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
    };

    // Display Comparison
    const displayComparison = (originalBase64, generatedBase64) => {
        comparisonOriginal.src = `data:image/jpeg;base64,${originalBase64}`;
        comparisonGenerated.src = `data:image/jpeg;base64,${generatedBase64}`;
        comparisonCard.classList.remove('hidden');
    };
});
