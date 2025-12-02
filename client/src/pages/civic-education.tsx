import {
  Play,
  BookOpen,
  Target,
  Clock,
  CheckCircle,
  Video,
  TrendingUp,
  Lightbulb,
  ChevronRight,
  Star,
  Award,
} from 'lucide-react';
import React, { useState, useMemo } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Type definitions for better type safety and code clarity
interface VideoModule {
  id: string;
  title: string;
  description: string;
  duration: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  thumbnail: string;
  videoUrl: string;
  completed: boolean;
  keyTakeaways: string[];
}

interface LearningPath {
  id: string;
  title: string;
  description: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: string;
  modules: VideoModule[];
  prerequisites?: string[];
  outcomes: string[];
}

interface CaseStudy {
  id: string;
  title: string;
  campaign: string;
  year: number;
  outcome: 'success' | 'partial' | 'ongoing';
  description: string;
  keyStrategies: string[];
  impact: string;
  lessons: string[];
  videoUrl?: string;
}

const CivicEducationPage: React.FC = () => {
  // State management for the application
  const [activeTab, setActiveTab] = useState('learning-paths');
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [completedModules, setCompletedModules] = useState<Set<string>>(new Set());

  // Mock data organized as structured learning paths - wrapped in useMemo to prevent recreation on every render
  const learningPaths: LearningPath[] = useMemo(
    () => [
      {
        id: 'civics-basics',
        title: 'Civics Fundamentals',
        description: 'Learn the basics of government, democracy, and citizen participation',
        level: 'beginner',
        estimatedTime: '2-3 hours',
        modules: [
          {
            id: 'what-is-government',
            title: 'What is Government?',
            description:
              'Understanding the role and structure of government in democratic societies',
            duration: '8 min',
            level: 'beginner',
            thumbnail: '/api/placeholder/320/180',
            videoUrl: '#',
            completed: false,
            keyTakeaways: [
              'Government provides essential services and maintains social order',
              'Different levels work together: national, county, and local government',
              'Power is divided between executive, legislative, and judicial branches',
            ],
          },
          {
            id: 'how-laws-are-made',
            title: 'How Laws Are Made',
            description: 'The legislative process from initial bill to enacted law',
            duration: '12 min',
            level: 'beginner',
            thumbnail: '/api/placeholder/320/180',
            videoUrl: '#',
            completed: false,
            keyTakeaways: [
              'Bills originate from citizens, Members of Parliament, or government ministries',
              'Legislation passes through multiple readings and committee reviews',
              'Presidential assent is the final step to make a bill into law',
            ],
          },
          {
            id: 'citizen-rights',
            title: 'Your Rights as a Citizen',
            description: 'Constitutional rights and civic responsibilities',
            duration: '10 min',
            level: 'beginner',
            thumbnail: '/api/placeholder/320/180',
            videoUrl: '#',
            completed: false,
            keyTakeaways: [
              'Fundamental rights include life, education, healthcare, and fair trial',
              'Freedom of expression, assembly, and association are protected',
              'Civic duties include voting, paying taxes, and respecting laws',
            ],
          },
        ],
        outcomes: [
          'Understand how government structures work and interact',
          'Follow the journey of legislation from idea to law',
          'Know your constitutional rights and civic responsibilities',
        ],
      },
      {
        id: 'advocacy-strategies',
        title: 'Effective Advocacy',
        description: 'Master the art of influencing policy and creating meaningful change',
        level: 'intermediate',
        estimatedTime: '4-5 hours',
        prerequisites: ['civics-basics'],
        modules: [
          {
            id: 'building-coalitions',
            title: 'Building Effective Coalitions',
            description: 'How to unite diverse groups around common goals',
            duration: '15 min',
            level: 'intermediate',
            thumbnail: '/api/placeholder/320/180',
            videoUrl: '#',
            completed: false,
            keyTakeaways: [
              'Identify shared interests that bridge different organizational priorities',
              'Develop clear, unified messaging that resonates across groups',
              'Create inclusive decision-making processes that maintain coalition unity',
            ],
          },
          {
            id: 'lobbying-techniques',
            title: 'Lobbying and Direct Advocacy',
            description: 'Professional approaches to influencing policymakers',
            duration: '18 min',
            level: 'intermediate',
            thumbnail: '/api/placeholder/320/180',
            videoUrl: '#',
            completed: false,
            keyTakeaways: [
              'Schedule strategic meetings with elected representatives and their staff',
              'Prepare compelling data combined with personal stories',
              'Follow up consistently to build long-term relationships',
            ],
          },
          {
            id: 'media-strategies',
            title: 'Media and Public Campaigns',
            description: 'Using media channels to amplify your advocacy message',
            duration: '20 min',
            level: 'intermediate',
            thumbnail: '/api/placeholder/320/180',
            videoUrl: '#',
            completed: false,
            keyTakeaways: [
              'Craft newsworthy stories and professional press releases',
              'Build relationships with journalists who cover your issues',
              'Use social media strategically to create engagement',
            ],
          },
        ],
        outcomes: [
          'Build and effectively lead multi-stakeholder coalitions',
          'Lobby policymakers with confidence and professionalism',
          'Create compelling campaigns that capture public attention',
        ],
      },
      {
        id: 'strategic-campaigning',
        title: 'Strategic Campaign Management',
        description: 'Plan and execute sophisticated advocacy campaigns that achieve results',
        level: 'advanced',
        estimatedTime: '6-8 hours',
        prerequisites: ['advocacy-strategies'],
        modules: [
          {
            id: 'campaign-planning',
            title: 'Strategic Campaign Planning',
            description: 'Developing comprehensive campaign strategies from start to finish',
            duration: '25 min',
            level: 'advanced',
            thumbnail: '/api/placeholder/320/180',
            videoUrl: '#',
            completed: false,
            keyTakeaways: [
              'Conduct thorough stakeholder and power analysis',
              'Set SMART objectives with measurable, achievable goals',
              'Develop contingency plans and comprehensive risk assessments',
            ],
          },
          {
            id: 'data-driven-advocacy',
            title: 'Data-Driven Advocacy',
            description: 'Using research and data to strengthen campaign effectiveness',
            duration: '22 min',
            level: 'advanced',
            thumbnail: '/api/placeholder/320/180',
            videoUrl: '#',
            completed: false,
            keyTakeaways: [
              'Collect and analyze relevant data from reliable sources',
              'Use evidence to build persuasive, fact-based arguments',
              'Track campaign metrics and adjust strategies based on results',
            ],
          },
          {
            id: 'policy-negotiation',
            title: 'Advanced Policy Negotiation',
            description: 'Negotiating with multiple stakeholders and competing interests',
            duration: '28 min',
            level: 'advanced',
            thumbnail: '/api/placeholder/320/180',
            videoUrl: '#',
            completed: false,
            keyTakeaways: [
              'Understand and map different stakeholder interests and motivations',
              'Find win-win solutions through creative negotiation approaches',
              'Build consensus among diverse groups with competing priorities',
            ],
          },
        ],
        outcomes: [
          'Design and execute complex, multi-phase advocacy campaigns',
          'Use data and research to make evidence-based strategic decisions',
          'Negotiate policy changes successfully with diverse stakeholders',
        ],
      },
    ],
    []
  ); // Empty dependency array since this data is static

  // Case studies showcasing real-world civic engagement examples - also memoized
  const caseStudies: CaseStudy[] = useMemo(
    () => [
      {
        id: 'education-reform-2019',
        title: 'Free Secondary Education Campaign',
        campaign: 'Education for All',
        year: 2019,
        outcome: 'success',
        description:
          'A coalition of parents, teachers, and civil society organizations successfully campaigned for the elimination of school fees in secondary education, leading to dramatic increases in enrollment rates across the country.',
        keyStrategies: [
          'Mass mobilization through coordinated social media campaigns',
          'Petition drives collecting over 1 million signatures nationwide',
          'Strategic partnerships with media outlets and religious leaders',
          'Direct lobbying of parliamentarians with data on education access',
        ],
        impact:
          'Secondary school enrollment increased by 15 percent, benefiting over 200,000 students from low-income families. The policy change removed financial barriers that had prevented many children from accessing education.',
        lessons: [
          'Social media can rapidly build public support when used strategically',
          'Petitions demonstrate grassroots support and give policymakers political cover',
          'Religious leaders can influence community opinion in conservative areas',
          'Timing campaigns around election cycles increases political leverage',
        ],
        videoUrl: '#',
      },
      {
        id: 'anti-corruption-2020',
        title: 'Corruption Accountability Drive',
        campaign: 'Accountability Now',
        year: 2020,
        outcome: 'partial',
        description:
          'Civil society organizations pushed for stronger anti-corruption measures, resulting in new legislation but facing ongoing challenges with implementation and enforcement.',
        keyStrategies: [
          'Data-driven research exposing corruption patterns in government contracts',
          'Multi-stakeholder coalition building across business, civil society, and academia',
          'International partnerships for technical support and funding',
          'Judicial activism through strategic litigation targeting corrupt officials',
        ],
        impact:
          'New anti-corruption law passed with stronger penalties and independent oversight, but enforcement remains inconsistent due to political interference. Public awareness of corruption increased significantly through the campaign.',
        lessons: [
          'Research and data are crucial for establishing credibility with the public',
          'International support can provide technical expertise and protect activists',
          'Legal action can complement advocacy efforts but is not sufficient alone',
          'Implementation requires ongoing monitoring and sustained pressure',
        ],
      },
      {
        id: 'climate-action-2022',
        title: 'Youth Climate Movement',
        campaign: 'Climate Voices',
        year: 2022,
        outcome: 'ongoing',
        description:
          'Young activists organized nationwide campaigns demanding stronger climate action, successfully influencing national policy discussions and bringing youth perspectives to decision-making tables.',
        keyStrategies: [
          'Youth-led social media campaigns with viral hashtags and challenges',
          'School-based education and peer-to-peer mobilization',
          'Artistic protests and creative demonstrations that attracted media',
          'Youth parliament engagement and mentorship from older activists',
        ],
        impact:
          'Climate change is now a priority in national development planning. Over 50,000 youth have been engaged in climate advocacy, and a youth advisory board was created for environmental policy.',
        lessons: [
          'Youth engagement brings fresh energy and perspectives to established movements',
          'Creative protest methods attract media attention more effectively than traditional approaches',
          'School networks provide strong mobilization channels with built-in community',
          'Long-term engagement builds sustained movement power beyond single campaigns',
        ],
        videoUrl: '#',
      },
    ],
    []
  ); // Empty dependency array since this data is static

  // Helper function to mark a module as completed
  const markModuleComplete = (moduleId: string) => {
    setCompletedModules(prev => new Set([...prev, moduleId]));
  };

  // Helper function to get appropriate color styling for different levels
  const getLevelColor = (level: string): string => {
    switch (level) {
      case 'beginner':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'advanced':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Helper function to get appropriate color styling for campaign outcomes
  const getOutcomeColor = (outcome: string): string => {
    switch (outcome) {
      case 'success':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'ongoing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Find the currently selected learning path data
  const selectedPathData = useMemo(
    () => learningPaths.find(p => p.id === selectedPath),
    [selectedPath, learningPaths]
  );

  // Calculate overall progress across all completed modules
  const overallProgress = useMemo(() => {
    const totalModules = learningPaths.reduce((sum, path) => sum + path.modules.length, 0);
    return totalModules > 0 ? (completedModules.size / totalModules) * 100 : 0;
  }, [completedModules, learningPaths]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header section with title and description */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <BookOpen className="w-12 h-12 text-blue-600" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Civic Education Center
            </h1>
          </div>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Master the skills of democratic participation and effective advocacy. Learn from
            interactive videos, progressive courses, and real-world case studies that demonstrate
            how citizens create change.
          </p>

          {/* Overall progress indicator */}
          {completedModules.size > 0 && (
            <div className="mt-6 max-w-md mx-auto">
              <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                <span className="flex items-center gap-2">
                  <Award className="w-4 h-4" />
                  Your Overall Progress
                </span>
                <span className="font-semibold">{completedModules.size} modules completed</span>
              </div>
              <Progress value={overallProgress} className="h-3" />
            </div>
          )}
        </div>

        {/* Main tabbed content area */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-2xl mx-auto">
            <TabsTrigger value="learning-paths" className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              Learning Paths
            </TabsTrigger>
            <TabsTrigger value="video-library" className="flex items-center gap-2">
              <Video className="w-4 h-4" />
              Video Library
            </TabsTrigger>
            <TabsTrigger value="case-studies" className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4" />
              Case Studies
            </TabsTrigger>
          </TabsList>

          {/* Learning Paths Tab Content */}
          <TabsContent value="learning-paths" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Path Selection Panel */}
              <div>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="w-5 h-5" />
                      Choose Your Path
                    </CardTitle>
                    <CardDescription>
                      Select a structured learning journey based on your experience level
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {learningPaths.map(path => {
                      const pathCompletedModules = path.modules.filter(m =>
                        completedModules.has(m.id)
                      ).length;
                      const pathProgress = (pathCompletedModules / path.modules.length) * 100;

                      return (
                        <Card
                          key={path.id}
                          className={`cursor-pointer transition-all hover:shadow-md ${
                            selectedPath === path.id ? 'ring-2 ring-blue-500 shadow-md' : ''
                          }`}
                          onClick={() => setSelectedPath(path.id)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <h3 className="font-semibold text-lg">{path.title}</h3>
                              <Badge className={getLevelColor(path.level)} variant="outline">
                                {path.level}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mb-3">{path.description}</p>
                            <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {path.estimatedTime}
                              </span>
                              <span className="flex items-center gap-1">
                                <Play className="w-3 h-3" />
                                {path.modules.length} modules
                              </span>
                            </div>
                            {path.prerequisites && (
                              <p className="text-xs text-gray-500 mb-2">
                                Prerequisites: {path.prerequisites.join(', ')}
                              </p>
                            )}
                            {pathCompletedModules > 0 && (
                              <div className="space-y-1">
                                <div className="flex justify-between text-xs text-gray-600">
                                  <span>Progress</span>
                                  <span>
                                    {pathCompletedModules} / {path.modules.length}
                                  </span>
                                </div>
                                <Progress value={pathProgress} className="h-2" />
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </CardContent>
                </Card>
              </div>

              {/* Path Details Panel */}
              <div>
                {selectedPathData ? (
                  <Card>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle>{selectedPathData.title}</CardTitle>
                          <CardDescription className="mt-2">
                            {selectedPathData.description}
                          </CardDescription>
                        </div>
                        <Badge className={getLevelColor(selectedPathData.level)} variant="outline">
                          {selectedPathData.level}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Progress indicator for selected path */}
                      <div>
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="font-medium">Progress</span>
                          <span className="text-gray-600">
                            {
                              selectedPathData.modules.filter(m => completedModules.has(m.id))
                                .length
                            }{' '}
                            / {selectedPathData.modules.length} completed
                          </span>
                        </div>
                        <Progress
                          value={
                            (selectedPathData.modules.filter(m => completedModules.has(m.id))
                              .length /
                              selectedPathData.modules.length) *
                            100
                          }
                          className="h-2"
                        />
                      </div>

                      {/* Module list with completion tracking */}
                      <div>
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                          <Play className="w-4 h-4" />
                          Course Modules
                        </h3>
                        <div className="space-y-3">
                          {selectedPathData.modules.map((module, index) => (
                            <Card
                              key={module.id}
                              className={
                                completedModules.has(module.id)
                                  ? 'bg-green-50 border-green-200'
                                  : ''
                              }
                            >
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <h4 className="font-medium">{module.title}</h4>
                                      {completedModules.has(module.id) && (
                                        <CheckCircle className="w-4 h-4 text-green-600" />
                                      )}
                                    </div>
                                    <p className="text-sm text-gray-600">{module.description}</p>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between mt-3">
                                  <div className="flex items-center gap-3 text-xs text-gray-500">
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {module.duration}
                                    </span>
                                    <Badge variant="outline" className="text-xs">
                                      Module {index + 1}
                                    </Badge>
                                  </div>
                                  {completedModules.has(module.id) ? (
                                    <Badge className="bg-green-100 text-green-800">Completed</Badge>
                                  ) : (
                                    <Button
                                      size="sm"
                                      onClick={() => markModuleComplete(module.id)}
                                      className="flex items-center gap-1"
                                    >
                                      <Play className="w-3 h-3" />
                                      Watch
                                    </Button>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>

                      {/* Learning outcomes section */}
                      <div>
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                          <Star className="w-4 h-4" />
                          What You&apos;ll Learn
                        </h3>
                        <div className="space-y-2">
                          {selectedPathData.outcomes.map((outcome, index) => (
                            <div key={index} className="flex items-start gap-2 text-sm">
                              <ChevronRight className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                              <span>{outcome}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="h-full flex items-center justify-center">
                    <CardContent className="text-center py-12">
                      <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold mb-2">Select a Learning Path</h3>
                      <p className="text-gray-600">
                        Choose from our curated courses to begin your civic education journey
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Video Library Tab Content */}
          <TabsContent value="video-library">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {learningPaths
                .flatMap(path => path.modules)
                .map(module => (
                  <Card
                    key={module.id}
                    className="overflow-hidden hover:shadow-lg transition-shadow"
                  >
                    <div className="relative">
                      <img
                        src={module.thumbnail}
                        alt={module.title}
                        className="w-full h-48 object-cover"
                      />
                      <div className="absolute top-2 right-2 flex gap-2">
                        <Badge className={getLevelColor(module.level)} variant="outline">
                          {module.level}
                        </Badge>
                        <Badge className="bg-black/70 text-white">{module.duration}</Badge>
                      </div>
                      {completedModules.has(module.id) && (
                        <div className="absolute top-2 left-2">
                          <Badge className="bg-green-600 text-white">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Completed
                          </Badge>
                        </div>
                      )}
                    </div>
                    <CardHeader>
                      <CardTitle className="text-lg">{module.title}</CardTitle>
                      <CardDescription>{module.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button
                        className="w-full"
                        onClick={() => markModuleComplete(module.id)}
                        disabled={completedModules.has(module.id)}
                      >
                        <Play className="w-4 h-4 mr-2" />
                        {completedModules.has(module.id) ? 'Watched' : 'Watch Video'}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </TabsContent>

          {/* Case Studies Tab Content */}
          <TabsContent value="case-studies">
            <div className="space-y-6">
              {caseStudies.map(study => (
                <Card key={study.id} className="overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-xl mb-2">{study.title}</CardTitle>
                        <div className="flex items-center gap-3 text-sm text-gray-600">
                          <span className="font-medium">{study.campaign}</span>
                          <span>•</span>
                          <span>{study.year}</span>
                        </div>
                      </div>
                      <Badge className={getOutcomeColor(study.outcome)} variant="outline">
                        {study.outcome}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    <p className="text-gray-700 leading-relaxed">{study.description}</p>

                    <div>
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        Key Strategies
                      </h4>
                      <div className="grid md:grid-cols-2 gap-3">
                        {study.keyStrategies.map((strategy, index) => (
                          <div
                            key={index}
                            className="flex items-start gap-2 text-sm bg-blue-50 p-3 rounded-lg"
                          >
                            <ChevronRight className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                            <span>{strategy}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-green-50 p-4 rounded-lg">
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <Target className="w-4 h-4" />
                        Impact
                      </h4>
                      <p className="text-sm text-gray-700">{study.impact}</p>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <Lightbulb className="w-4 h-4" />
                        Key Lessons
                      </h4>
                      <div className="space-y-2">
                        {study.lessons.map((lesson, index) => (
                          <div
                            key={index}
                            className="flex items-start gap-2 text-sm bg-purple-50 p-3 rounded-lg"
                          >
                            <Star className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                            <span>{lesson}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {study.videoUrl && (
                      <Button className="w-full md:w-auto">
                        <Video className="w-4 h-4 mr-2" />
                        Watch Case Study Video
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default CivicEducationPage;
