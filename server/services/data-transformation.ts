import { z } from 'zod';

// Data transformation pipeline for different government data formats
export class DataTransformationService {
  
  /**
   * Transform Canadian Parliament data format
   */
  static transformParliamentData(rawData: any): any {
    if (!rawData) return null;

    // Handle different XML/JSON structures from Parliament API
    if (rawData.Bills && rawData.Bills.Bill) {
      return {
        bills: Array.isArray(rawData.Bills.Bill) 
          ? rawData.Bills.Bill.map(this.transformParliamentBill)
          : [this.transformParliamentBill(rawData.Bills.Bill)]
      };
    }

    if (rawData.Members && rawData.Members.Member) {
      return {
        sponsors: Array.isArray(rawData.Members.Member)
          ? rawData.Members.Member.map(this.transformParliamentMember)
          : [this.transformParliamentMember(rawData.Members.Member)]
      };
    }

    return rawData;
  }

  /**
   * Transform individual Parliament bill data
   */
  private static transformParliamentBill(bill: any): any {
    return {
      id: bill.BillId || bill.id,
      title: bill.Title || bill.LongTitle || bill.title,
      description: bill.Summary || bill.description,
      content: bill.FullText || bill.content,
      summary: bill.ShortSummary || bill.Summary || bill.summary,
      status: this.mapParliamentStatus(bill.Status || bill.status),
      billNumber: bill.Number || bill.BillNumber || bill.billNumber,
      introducedDate: bill.IntroducedDate || bill.introducedDate,
      lastActionDate: bill.LastActionDate || bill.lastActionDate,
      sponsors: this.extractParliamentSponsors(bill),
      category: bill.Subject || bill.category,
      tags: this.extractTags(bill.Keywords || bill.tags),
      source: 'parliament-ca',
      sourceUrl: bill.Url || bill.url,
      lastUpdated: bill.LastModified || bill.updatedAt || new Date().toISOString()
    };
  }

  /**
   * Transform individual Parliament member data
   */
  private static transformParliamentMember(member: any): any {
    return {
      id: member.PersonId || member.id,
      name: `${member.FirstName || ''} ${member.LastName || ''}`.trim() || member.name,
      role: member.Title || member.role || 'MP',
      party: member.Party || member.party,
      constituency: member.Constituency || member.constituency,
      email: member.Email || member.email,
      phone: member.Phone || member.phone,
      bio: member.Biography || member.bio,
      photoUrl: member.PhotoUrl || member.photoUrl,
      affiliations: this.extractAffiliations(member),
      source: 'parliament-ca',
      sourceUrl: member.Url || member.url,
      lastUpdated: member.LastModified || member.updatedAt || new Date().toISOString()
    };
  }

  /**
   * Transform Ontario Legislature data format
   */
  static transformOntarioLegislatureData(rawData: any): any {
    if (!rawData) return null;

    // Handle Ontario Legislature HTML/JSON format
    if (rawData.bills) {
      return {
        bills: rawData.bills.map(this.transformOntarioBill)
      };
    }

    if (rawData.members) {
      return {
        sponsors: rawData.members.map(this.transformOntarioMember)
      };
    }

    return rawData;
  }

  /**
   * Transform individual Ontario bill data
   */
  private static transformOntarioBill(bill: any): any {
    return {
      id: bill.bill_id || bill.id,
      title: bill.title || bill.long_title,
      description: bill.summary || bill.description,
      content: bill.full_text || bill.content,
      summary: bill.short_summary || bill.summary,
      status: this.mapOntarioStatus(bill.status),
      billNumber: bill.bill_number || bill.number,
      introducedDate: bill.introduced_date,
      lastActionDate: bill.last_action_date,
      sponsors: this.extractOntarioSponsors(bill),
      category: bill.ministry || bill.category,
      tags: this.extractTags(bill.keywords),
      source: 'ontario-legislature',
      sourceUrl: bill.url,
      lastUpdated: bill.updated_at || new Date().toISOString()
    };
  }

  /**
   * Transform individual Ontario member data
   */
  private static transformOntarioMember(member: any): any {
    return {
      id: member.member_id || member.id,
      name: member.name || `${member.first_name || ''} ${member.last_name || ''}`.trim(),
      role: member.title || 'MPP',
      party: member.party,
      constituency: member.riding || member.constituency,
      email: member.email,
      phone: member.phone,
      bio: member.biography,
      photoUrl: member.photo_url,
      affiliations: this.extractAffiliations(member),
      source: 'ontario-legislature',
      sourceUrl: member.url,
      lastUpdated: member.updated_at || new Date().toISOString()
    };
  }

  /**
   * Transform OpenParliament.ca data format
   */
  static transformOpenParliamentData(rawData: any): any {
    if (!rawData) return null;

    // Handle OpenParliament API format
    if (rawData.objects) {
      // Determine if this is bills or politicians data
      if (rawData.objects[0] && rawData.objects[0].number) {
        return {
          bills: rawData.objects.map(this.transformOpenParliamentBill)
        };
      } else if (rawData.objects[0] && rawData.objects[0].name) {
        return {
          sponsors: rawData.objects.map(this.transformOpenParliamentPolitician)
        };
      }
    }

    return rawData;
  }

  /**
   * Transform individual OpenParliament bill data
   */
  private static transformOpenParliamentBill(bill: any): any {
    return {
      id: bill.id,
      title: bill.name || bill.title,
      description: bill.summary,
      content: bill.text,
      summary: bill.summary,
      status: this.mapOpenParliamentStatus(bill.status),
      billNumber: bill.number,
      introducedDate: bill.introduced,
      lastActionDate: bill.last_action_date,
      sponsors: bill.sponsor_politician ? [{
        id: bill.sponsor_politician.id,
        name: bill.sponsor_politician.name,
        role: 'MP',
        party: bill.sponsor_politician.party,
        sponsorshipType: 'primary'
      }] : [],
      category: bill.law_type,
      tags: this.extractTags(bill.keywords),
      source: 'openparliament',
      sourceUrl: `https://openparliament.ca${bill.url}`,
      lastUpdated: bill.updated || new Date().toISOString()
    };
  }

  /**
   * Transform individual OpenParliament politician data
   */
  private static transformOpenParliamentPolitician(politician: any): any {
    return {
      id: politician.id,
      name: politician.name,
      role: 'MP',
      party: politician.party,
      constituency: politician.riding,
      email: politician.email,
      phone: politician.phone,
      bio: politician.description,
      photoUrl: politician.photo_url,
      affiliations: [],
      source: 'openparliament',
      sourceUrl: `https://openparliament.ca${politician.url}`,
      lastUpdated: politician.updated || new Date().toISOString()
    };
  }

  /**
   * Map Parliament status to normalized status
   */
  private static mapParliamentStatus(status: string): string {
    if (!status) return 'introduced';
    
    const statusMap: Record<string, string> = {
      'First Reading': 'introduced',
      'Second Reading': 'committee',
      'Committee Stage': 'committee',
      'Report Stage': 'committee',
      'Third Reading': 'passed',
      'Royal Assent': 'signed',
      'In Force': 'signed',
      'Defeated': 'failed',
      'Withdrawn': 'failed',
      'Prorogued': 'failed'
    };

    return statusMap[status] || status.toLowerCase();
  }

  /**
   * Map Ontario Legislature status to normalized status
   */
  private static mapOntarioStatus(status: string): string {
    if (!status) return 'introduced';
    
    const statusMap: Record<string, string> = {
      'Introduced': 'introduced',
      'First Reading': 'introduced',
      'Second Reading': 'committee',
      'Committee': 'committee',
      'Third Reading': 'passed',
      'Royal Assent': 'signed',
      'Proclamation': 'signed',
      'Defeated': 'failed',
      'Withdrawn': 'failed'
    };

    return statusMap[status] || status.toLowerCase();
  }

  /**
   * Map OpenParliament status to normalized status
   */
  private static mapOpenParliamentStatus(status: string): string {
    if (!status) return 'introduced';
    
    const statusMap: Record<string, string> = {
      'Introduced': 'introduced',
      'First reading': 'introduced',
      'Second reading': 'committee',
      'Committee': 'committee',
      'Third reading': 'passed',
      'Royal assent': 'signed',
      'Defeated': 'failed',
      'Withdrawn': 'failed'
    };

    return statusMap[status] || status.toLowerCase();
  }

  /**
   * Extract sponsors from Parliament bill data
   */
  private static extractParliamentSponsors(bill: any): any[] {
    const sponsors = [];
    
    if (bill.SponsorMember) {
      sponsors.push({
        id: bill.SponsorMember.PersonId,
        name: `${bill.SponsorMember.FirstName} ${bill.SponsorMember.LastName}`,
        role: 'MP',
        party: bill.SponsorMember.Party,
        sponsorshipType: 'primary'
      });
    }

    if (bill.CoSponsors && Array.isArray(bill.CoSponsors)) {
      sponsors.push(...bill.CoSponsors.map((cosponsor: any) => ({
        id: cosponsor.PersonId,
        name: `${cosponsor.FirstName} ${cosponsor.LastName}`,
        role: 'MP',
        party: cosponsor.Party,
        sponsorshipType: 'co-sponsor'
      })));
    }

    return sponsors;
  }

  /**
   * Extract sponsors from Ontario bill data
   */
  private static extractOntarioSponsors(bill: any): any[] {
    const sponsors = [];
    
    if (bill.sponsor) {
      sponsors.push({
        id: bill.sponsor.id,
        name: bill.sponsor.name,
        role: 'MPP',
        party: bill.sponsor.party,
        sponsorshipType: 'primary'
      });
    }

    return sponsors;
  }

  /**
   * Extract affiliations from member data
   */
  private static extractAffiliations(member: any): any[] {
    const affiliations = [];

    // Extract party affiliation
    if (member.Party || member.party) {
      affiliations.push({
        organization: member.Party || member.party,
        role: 'Member',
        type: 'political',
        startDate: member.PartyStartDate || member.party_start_date,
        endDate: member.PartyEndDate || member.party_end_date
      });
    }

    // Extract committee memberships
    if (member.Committees && Array.isArray(member.Committees)) {
      affiliations.push(...member.Committees.map((committee: any) => ({
        organization: committee.Name || committee.name,
        role: committee.Role || committee.role || 'Member',
        type: 'professional',
        startDate: committee.StartDate || committee.start_date,
        endDate: committee.EndDate || committee.end_date
      })));
    }

    // Extract other affiliations
    if (member.Affiliations && Array.isArray(member.Affiliations)) {
      affiliations.push(...member.Affiliations.map((affiliation: any) => ({
        organization: affiliation.Organization || affiliation.organization,
        role: affiliation.Role || affiliation.role,
        type: affiliation.Type || affiliation.type || 'professional',
        startDate: affiliation.StartDate || affiliation.start_date,
        endDate: affiliation.EndDate || affiliation.end_date
      })));
    }

    return affiliations;
  }

  /**
   * Extract and normalize tags
   */
  private static extractTags(tags: any): string[] {
    if (!tags) return [];
    
    if (typeof tags === 'string') {
      return tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    }
    
    if (Array.isArray(tags)) {
      return tags.map(tag => typeof tag === 'string' ? tag.trim() : String(tag).trim())
                 .filter(tag => tag.length > 0);
    }
    
    return [];
  }

  /**
   * Validate transformed data against schema
   */
  static validateTransformedData(data: any, type: 'bills' | 'sponsors'): {
    valid: boolean;
    errors: string[];
    validRecords: any[];
    invalidRecords: any[];
  } {
    const result: {
      valid: boolean;
      errors: string[];
      validRecords: any[];
      invalidRecords: any[];
    } = {
      valid: true,
      errors: [],
      validRecords: [],
      invalidRecords: []
    };

    if (!data || (!data.bills && !data.sponsors)) {
      result.valid = false;
      result.errors.push('No data provided or invalid data structure');
      return result;
    }

    const records = type === 'bills' ? data.bills : data.sponsors;
    if (!Array.isArray(records)) {
      result.valid = false;
      result.errors.push(`Expected array of ${type}, got ${typeof records}`);
      return result;
    }

    // Define validation schemas
    const BillSchema = z.object({
      id: z.string(),
      title: z.string().min(1),
      billNumber: z.string().min(1),
      status: z.string().min(1),
      source: z.string().min(1)
    });

    const SponsorSchema = z.object({
      id: z.string(),
      name: z.string().min(1),
      role: z.string().min(1),
      source: z.string().min(1)
    });

    const schema = type === 'bills' ? BillSchema : SponsorSchema;

    for (const record of records) {
      try {
        schema.parse(record);
        result.validRecords.push(record);
      } catch (error) {
        result.valid = false;
        result.invalidRecords.push(record);
        const errorMessage = error instanceof Error ? error.message : String(error);
        result.errors.push(`Invalid ${type.slice(0, -1)} record: ${errorMessage}`);
      }
    }

    return result;
  }

  /**
   * Clean and normalize text data
   */
  static cleanTextData(text: string): string {
    if (!text || typeof text !== 'string') return '';
    
    return text
      .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
      .replace(/[\r\n]+/g, '\n') // Normalize line breaks
      .trim(); // Remove leading/trailing whitespace
  }

  /**
   * Normalize date strings to ISO format
   */
  static normalizeDate(dateString: string): string | null {
    if (!dateString) return null;
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return null;
      return date.toISOString();
    } catch (error) {
      return null;
    }
  }

  /**
   * Extract and normalize phone numbers
   */
  static normalizePhoneNumber(phone: string): string | null {
    if (!phone || typeof phone !== 'string') return null;
    
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');
    
    // Canadian phone number format
    if (digits.length === 10) {
      return `+1-${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
    } else if (digits.length === 11 && digits.startsWith('1')) {
      return `+1-${digits.slice(1, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
    }
    
    return phone; // Return original if can't normalize
  }

  /**
   * Extract and validate email addresses
   */
  static normalizeEmail(email: string): string | null {
    if (!email || typeof email !== 'string') return null;
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const normalizedEmail = email.toLowerCase().trim();
    
    return emailRegex.test(normalizedEmail) ? normalizedEmail : null;
  }
}