import React from 'react';
import { cn } from "@/lib/utils";

export const ResponsiveTextContainer = ({ 
    children, 
    className = "",
    maxHeight = "none",
    enableScrollFallback = true,
    fontSize = "responsive",
    ...props 
}) => {
    return (
        <div 
            className={cn(
                // Base container styling
                "w-full overflow-hidden",
                
                // Text wrapping and breaking
                "break-words hyphens-auto",
                "[word-wrap:break-word]",
                "[overflow-wrap:break-word]",
                "[word-break:break-word]",
                
                // Responsive typography
                fontSize === "responsive" && [
                    "text-sm sm:text-base lg:text-lg",
                    "leading-relaxed sm:leading-relaxed lg:leading-relaxed"
                ],
                
                // Dynamic height with optional max-height
                maxHeight !== "none" && `max-h-[${maxHeight}]`,
                
                // Scrollbar fallback (only when content exceeds max-height)
                enableScrollFallback && maxHeight !== "none" && "overflow-y-auto",
                
                // Smooth transitions
                "transition-all duration-300 ease-in-out",
                
                className
            )}
            style={{
                // CSS Grid for better text layout
                display: 'grid',
                gridTemplateColumns: '1fr',
                gap: '0.5rem',
                
                // Advanced text properties
                textRendering: 'optimizeLegibility',
                wordSpacing: 'normal',
                letterSpacing: 'normal',
                
                // Ensure text stays within bounds
                minWidth: 0, // Prevents flex/grid items from overflowing
                
                // Custom CSS variables for responsive scaling
                '--text-scale-factor': 'clamp(0.875, 2.5vw, 1.125)',
                
                // Dynamic font sizing based on container
                fontSize: fontSize === "responsive" ? 'calc(1rem * var(--text-scale-factor))' : undefined
            }}
            {...props}
        >
            {children}
        </div>
    );
};

export const ResponsiveCodeBlock = ({ children, className = "", ...props }) => {
    return (
        <ResponsiveTextContainer 
            className={cn(
                "bg-slate-900 text-green-400 p-4 rounded-lg font-mono",
                "text-xs sm:text-sm lg:text-base",
                "overflow-x-auto", // Allow horizontal scroll for code
                "whitespace-pre-wrap", // Preserve formatting but allow wrapping
                className
            )}
            fontSize="fixed" // Don't scale code blocks
            {...props}
        >
            <code className="block">
                {children}
            </code>
        </ResponsiveTextContainer>
    );
};

export const ResponsiveMarkdownContainer = ({ children, className = "", ...props }) => {
    return (
        <ResponsiveTextContainer 
            className={cn(
                "prose prose-invert max-w-none",
                "prose-headings:text-teal-400 prose-headings:font-bold",
                "prose-p:text-slate-300 prose-p:leading-relaxed",
                "prose-strong:text-white prose-strong:font-semibold",
                "prose-ul:text-slate-300 prose-ol:text-slate-300",
                "prose-li:text-slate-300 prose-li:leading-relaxed",
                "prose-code:bg-slate-800 prose-code:text-teal-300 prose-code:px-2 prose-code:py-1 prose-code:rounded prose-code:text-sm prose-code:font-mono",
                "prose-pre:bg-slate-900 prose-pre:text-green-400 prose-pre:p-4 prose-pre:rounded-lg prose-pre:overflow-x-auto prose-pre:border prose-pre:border-slate-700",
                "prose-blockquote:border-l-4 prose-blockquote:border-teal-400 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-slate-300 prose-blockquote:bg-slate-800/30 prose-blockquote:py-2",
                
                // Responsive prose sizing
                "prose-sm sm:prose-base lg:prose-lg",
                
                className
            )}
            {...props}
        >
            {children}
        </ResponsiveTextContainer>
    );
};

// Global CSS styles to be added to your global CSS file
export const responsiveTextStyles = `
/* Responsive Text Container Utilities */
.responsive-text-container {
    /* Ensure text always fits within container */
    min-width: 0;
    max-width: 100%;
    
    /* Advanced word breaking */
    word-wrap: break-word;
    overflow-wrap: break-word;
    word-break: break-word;
    hyphens: auto;
    
    /* Smooth text rendering */
    text-rendering: optimizeLegibility;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
}

/* Container Query Support (modern browsers) */
@container (max-width: 400px) {
    .responsive-text-container {
        font-size: clamp(0.75rem, 3vw, 0.875rem);
        line-height: 1.4;
    }
}

@container (min-width: 401px) and (max-width: 800px) {
    .responsive-text-container {
        font-size: clamp(0.875rem, 2.5vw, 1rem);
        line-height: 1.5;
    }
}

@container (min-width: 801px) {
    .responsive-text-container {
        font-size: clamp(1rem, 2vw, 1.125rem);
        line-height: 1.6;
    }
}

/* Fallback for browsers without container query support */
@media (max-width: 400px) {
    .responsive-text-container {
        font-size: clamp(0.75rem, 3vw, 0.875rem);
    }
}

@media (min-width: 401px) and (max-width: 800px) {
    .responsive-text-container {
        font-size: clamp(0.875rem, 2.5vw, 1rem);
    }
}

@media (min-width: 801px) {
    .responsive-text-container {
        font-size: clamp(1rem, 2vw, 1.125rem);
    }
}
`;