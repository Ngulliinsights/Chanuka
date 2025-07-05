
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { 
  TrendingUp, 
  Users, 
  MessageSquare, 
  Shield, 
  Eye, 
  Vote, 
  Search,
  AlertTriangle,
  BarChart3,
  FileText,
  Network,
  Clock,
  CheckCircle,
  ArrowRight
} from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center space-y-6 max-w-4xl mx-auto">
          <Badge variant="outline" className="mb-4">
            Chanuka - Illuminating Democracy
          </Badge>
          <h1 className="text-5xl font-bold text-gray-900 leading-tight">
            Transform How Citizens 
            <span className="text-blue-600"> Engage</span> with Government
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Chanuka democratizes legislative transparency by making complex bills accessible, 
            tracking conflicts of interest, and enabling meaningful public participation in the democratic process.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4 pt-6">
            <Button asChild size="lg" className="text-lg px-8 py-3">
              <Link to="/bills">
                <Search className="mr-2 h-5 w-5" />
                Explore Bills Now
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="text-lg px-8 py-3" asChild>
              <Link to="/community-input">
                <MessageSquare className="mr-2 h-5 w-5" />
                Join the Conversation
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Problem Statement */}
      <section className="bg-white py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              The Democratic Participation Crisis
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Citizens are excluded from governance through complexity, opacity, and inaccessible systems.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-6 text-center">
                <AlertTriangle className="h-12 w-12 text-red-600 mx-auto mb-4" />
                <h3 className="font-semibold text-gray-900 mb-2">Information Complexity</h3>
                <p className="text-sm text-gray-600">Legal jargon excludes ordinary citizens</p>
              </CardContent>
            </Card>
            
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="p-6 text-center">
                <Users className="h-12 w-12 text-orange-600 mx-auto mb-4" />
                <h3 className="font-semibold text-gray-900 mb-2">Participation Inequity</h3>
                <p className="text-sm text-gray-600">Digital divides limit engagement</p>
              </CardContent>
            </Card>
            
            <Card className="border-yellow-200 bg-yellow-50">
              <CardContent className="p-6 text-center">
                <Eye className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
                <h3 className="font-semibold text-gray-900 mb-2">Process Opacity</h3>
                <p className="text-sm text-gray-600">Hidden decision-making breeds distrust</p>
              </CardContent>
            </Card>
            
            <Card className="border-purple-200 bg-purple-50">
              <CardContent className="p-6 text-center">
                <MessageSquare className="h-12 w-12 text-purple-600 mx-auto mb-4" />
                <h3 className="font-semibold text-gray-900 mb-2">Fragmented Voice</h3>
                <p className="text-sm text-gray-600">No structured feedback channels</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Core Features */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              The Chanuka Solution
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Comprehensive tools that transform legislative complexity into citizen empowerment.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Bill Analysis */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <FileText className="h-12 w-12 text-blue-600 mb-4" />
                <CardTitle>Legislative Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  Transform complex bills into accessible summaries with AI-powered analysis.
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Plain language summaries
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Impact assessments
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Constitutional analysis
                  </li>
                </ul>
                <Button variant="outline" className="w-full mt-4" asChild>
                  <Link to="/bills">
                    Explore Bills <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Conflict Detection */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <Network className="h-12 w-12 text-red-600 mb-4" />
                <CardTitle>Conflict Detection</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  Expose hidden connections between sponsors and beneficiaries.
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Financial interest mapping
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Voting pattern analysis
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Transparency scoring
                  </li>
                </ul>
                <Button variant="outline" className="w-full mt-4" asChild>
                  <Link to="/bills">
                    View Analysis <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Community Engagement */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <Vote className="h-12 w-12 text-green-600 mb-4" />
                <CardTitle>Public Participation</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  Enable structured citizen input that lawmakers can actually use.
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Verified citizen comments
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Expert verification
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Impact tracking
                  </li>
                </ul>
                <Button variant="outline" className="w-full mt-4" asChild>
                  <Link to="/community-input">
                    Participate <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* User Journey */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Your Democratic Journey
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              From awareness to action - see how Chanuka guides citizen engagement.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="font-semibold mb-2">1. Discover</h3>
              <p className="text-sm text-gray-600">Find bills affecting your community through intuitive search</p>
            </div>

            <div className="text-center">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="font-semibold mb-2">2. Analyze</h3>
              <p className="text-sm text-gray-600">Understand implications through AI-powered analysis</p>
            </div>

            <div className="text-center">
              <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="font-semibold mb-2">3. Engage</h3>
              <p className="text-sm text-gray-600">Share feedback through verified comment systems</p>
            </div>

            <div className="text-center">
              <div className="bg-orange-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="h-8 w-8 text-orange-600" />
              </div>
              <h3 className="font-semibold mb-2">4. Track</h3>
              <p className="text-sm text-gray-600">Monitor how your input influences legislative outcomes</p>
            </div>
          </div>
        </div>
      </section>

      {/* Current Statistics */}
      <section className="py-16 bg-blue-600 text-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">
              Democracy in Numbers
            </h2>
            <p className="text-blue-100 max-w-2xl mx-auto">
              Real impact through transparent governance.
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">247</div>
              <div className="text-blue-100">Bills Analyzed</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">12,834</div>
              <div className="text-blue-100">Citizens Engaged</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">3,492</div>
              <div className="text-blue-100">Comments Verified</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">89</div>
              <div className="text-blue-100">Conflicts Exposed</div>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-16 bg-gradient-to-r from-indigo-600 to-blue-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Illuminate Democracy?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join thousands of engaged citizens making their voices heard in the democratic process.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button size="lg" variant="secondary" className="text-lg px-8 py-3" asChild>
              <Link to="/bills">
                Start Exploring Bills
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8 py-3 border-white text-white hover:bg-white hover:text-blue-600" asChild>
              <Link to="/dashboard">
                View Dashboard
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
