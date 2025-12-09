import { FileText, Download, Search, Copy, BookOpen, Eye, EyeOff } from 'lucide-react';
import React, { useState, useMemo } from 'react';

import type { Bill } from '@client/types/core';
import { Button } from '@client/shared/design-system/primitives/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@client/shared/design-system/primitives/Card';
import { Input } from '@client/shared/design-system/primitives/Input';
import { Badge } from '@client/shared/design-system/primitives/Badge';
import { Separator } from '@client/shared/design-system/primitives/Separator';

interface BillFullTextTabProps {
  bill: Bill;
}

interface BillSection {
  id: string;
  title: string;
  content: string;
  level: number;
  lineNumbers: { start: number; end: number };
}

/**
 * BillFullTextTab - Full legislative text with search and navigation
 */
function BillFullTextTab({ bill }: BillFullTextTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['section-1']));

  // Mock full text for demonstration
  const mockFullText = `
SECTION 1. SHORT TITLE.

This Act may be cited as the "Technology Innovation and Digital Privacy Act of 2024".

SECTION 2. FINDINGS.

Congress finds the following:
(1) The rapid advancement of digital technologies has created unprecedented opportunities for innovation and economic growth.
(2) Citizens have a fundamental right to privacy and control over their personal data.
(3) A balanced approach is needed to foster innovation while protecting individual privacy rights.

SECTION 3. DEFINITIONS.

In this Act:
(1) DIGITAL SERVICE.—The term "digital service" means any online platform, application, or service that collects, processes, or stores personal data.
(2) PERSONAL DATA.—The term "personal data" means any information that relates to an identified or identifiable individual.
(3) PRIVACY BY DESIGN.—The term "privacy by design" means the integration of privacy considerations into the design and operation of digital services from the outset.

SECTION 4. PRIVACY PROTECTION REQUIREMENTS.

(a) GENERAL REQUIREMENTS.—Any digital service operating in the United States shall:
(1) implement privacy by design principles;
(2) obtain explicit consent before collecting personal data;
(3) provide clear and accessible privacy notices;
(4) allow users to access, correct, and delete their personal data.

(b) DATA MINIMIZATION.—Digital services shall collect only the minimum amount of personal data necessary to provide their services.

SECTION 5. ENFORCEMENT.

(a) FEDERAL TRADE COMMISSION.—The Federal Trade Commission shall have authority to enforce the provisions of this Act.
(b) PENALTIES.—Violations of this Act shall be subject to civil penalties of up to $10,000 per violation.

SECTION 6. EFFECTIVE DATE.

This Act shall take effect 180 days after the date of enactment.
  `.trim();

  // Parse the bill text into sections
  const parsedSections = useMemo(() => {
    const sections: BillSection[] = [];
    const lines = mockFullText.split('\n');
    let currentSection: Partial<BillSection> = {};
    let lineNumber = 1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Check if this is a section header
      if (trimmed.match(/^SECTION\s+\d+\./)) {
        // Save previous section if it exists
        if (currentSection.title && currentSection.content) {
          sections.push({
            ...currentSection,
            lineNumbers: { start: currentSection.lineNumbers?.start || 1, end: lineNumber - 1 }
          } as BillSection);
        }

        // Start new section
        currentSection = {
          id: `section-${sections.length + 1}`,
          title: trimmed,
          content: '',
          level: 1,
          lineNumbers: { start: lineNumber, end: lineNumber }
        };
      } else if (currentSection.title) {
        // Add content to current section
        currentSection.content = (currentSection.content || '') + line + '\n';
      }

      if (trimmed) lineNumber++;
    }

    // Add the last section
    if (currentSection.title && currentSection.content) {
      sections.push({
        ...currentSection,
        lineNumbers: { start: currentSection.lineNumbers?.start || 1, end: lineNumber }
      } as BillSection);
    }

    return sections;
  }, [mockFullText]);

  // Filter sections based on search term
  const filteredSections = useMemo(() => {
    if (!searchTerm) return parsedSections;
    
    return parsedSections.filter(section => 
      section.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      section.content.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [parsedSections, searchTerm]);

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  const expandAll = () => {
    setExpandedSections(new Set(parsedSections.map(s => s.id)));
  };

  const collapseAll = () => {
    setExpandedSections(new Set());
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // Could add toast notification here
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const highlightSearchTerm = (text: string, term: string) => {
    if (!term) return text;
    
    const regex = new RegExp(`(${term})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-200 px-1 rounded">$1</mark>');
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-500" />
            Full Legislative Text
          </CardTitle>
          <CardDescription>
            Complete text of {bill.billNumber} with search and navigation tools
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            {/* Search */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search within bill text..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowLineNumbers(!showLineNumbers)}
              >
                {showLineNumbers ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                Line Numbers
              </Button>
              
              <Button variant="outline" size="sm" onClick={expandAll}>
                <BookOpen className="h-4 w-4 mr-2" />
                Expand All
              </Button>
              
              <Button variant="outline" size="sm" onClick={collapseAll}>
                Collapse All
              </Button>
              
              <Button variant="outline" size="sm" onClick={() => copyToClipboard(mockFullText)}>
                <Copy className="h-4 w-4 mr-2" />
                Copy All
              </Button>
              
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
            </div>
          </div>

          {/* Search Results Summary */}
          {searchTerm && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-sm text-blue-800">
                Found {filteredSections.length} section{filteredSections.length !== 1 ? 's' : ''} containing "{searchTerm}"
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bill Metadata */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-medium">Bill Number:</span>
              <div className="text-muted-foreground">{bill.billNumber}</div>
            </div>
            <div>
              <span className="font-medium">Introduced:</span>
              <div className="text-muted-foreground">{new Date(bill.introducedDate).toLocaleDateString()}</div>
            </div>
            <div>
              <span className="font-medium">Status:</span>
              <Badge variant="outline">{bill.status}</Badge>
            </div>
            <div>
              <span className="font-medium">Length:</span>
              <div className="text-muted-foreground">{mockFullText.split('\n').length} lines</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bill Sections */}
      <div className="space-y-4">
        {filteredSections.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No sections found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search terms to find relevant sections.
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredSections.map((section) => {
            const isExpanded = expandedSections.has(section.id);
            
            return (
              <Card key={section.id}>
                <CardHeader 
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => toggleSection(section.id)}
                >
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      {searchTerm ? (
                        <span dangerouslySetInnerHTML={{ 
                          __html: highlightSearchTerm(section.title, searchTerm) 
                        }} />
                      ) : (
                        section.title
                      )}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {showLineNumbers && (
                        <Badge variant="secondary" className="text-xs">
                          Lines {section.lineNumbers.start}-{section.lineNumbers.end}
                        </Badge>
                      )}
                      <Button variant="ghost" size="sm">
                        {isExpanded ? '−' : '+'}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                {isExpanded && (
                  <CardContent>
                    <Separator className="mb-4" />
                    <div className="relative">
                      <pre className="whitespace-pre-wrap text-sm leading-relaxed font-mono bg-muted/30 p-4 rounded-lg overflow-x-auto">
                        {searchTerm ? (
                          <span dangerouslySetInnerHTML={{ 
                            __html: highlightSearchTerm(section.content, searchTerm) 
                          }} />
                        ) : (
                          section.content
                        )}
                      </pre>
                      
                      <div className="flex items-center gap-2 mt-3">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => copyToClipboard(section.content)}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copy Section
                        </Button>
                        
                        <Button variant="outline" size="sm">
                          <BookOpen className="h-4 w-4 mr-2" />
                          Analyze
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })
        )}
      </div>

      {/* Navigation Footer */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div>
              Showing {filteredSections.length} of {parsedSections.length} sections
            </div>
            <div className="flex items-center gap-4">
              <span>Total lines: {mockFullText.split('\n').length}</span>
              <span>Word count: ~{mockFullText.split(/\s+/).length}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default BillFullTextTab;