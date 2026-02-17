/**
 * FinancialExposureTracker - Detailed financial exposure analysis
 *
 * Tracks and visualizes financial interests by industry and source
 * with detailed breakdowns and trend analysis.
 */

import { DollarSign, TrendingUp, AlertTriangle, Building, Calendar } from 'lucide-react';
import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';

import { FinancialInterest, ConflictAnalysis } from '@client/features/analysis/types';
import { Badge } from '@client/lib/design-system';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@client/lib/design-system';
import { Progress } from '@client/lib/design-system';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@client/lib/design-system';

interface FinancialExposureTrackerProps {
  conflictAnalysis: ConflictAnalysis;
}

export function FinancialExposureTracker({ conflictAnalysis }: FinancialExposureTrackerProps) {
  // Process financial data for visualization
  const financialData = useMemo(() => {
    const { financialInterests = [] } = conflictAnalysis;

    // Group by industry
    const byIndustry = financialInterests.reduce(
      (acc, interest) => {
        if (!acc[interest.industry]) {
          acc[interest.industry] = {
            industry: interest.industry,
            total: 0,
            count: 0,
            categories: {} as Record<string, number>,
            verified: 0,
            unverified: 0,
          };
        }
        acc[interest.industry].total += interest.amount;
        acc[interest.industry].count += 1;
        acc[interest.industry].categories[interest.category] =
          (acc[interest.industry].categories[interest.category] || 0) + interest.amount;

        if (interest.verified) {
          acc[interest.industry].verified += interest.amount;
        } else {
          acc[interest.industry].unverified += interest.amount;
        }

        return acc;
      },
      {} as Record<string, unknown>
    );

    // Group by category
    const byCategory = financialInterests.reduce(
      (acc, interest) => {
        if (!acc[interest.category]) {
          acc[interest.category] = {
            category: interest.category,
            total: 0,
            count: 0,
            verified: 0,
            unverified: 0,
          };
        }
        acc[interest.category].total += interest.amount;
        acc[interest.category].count += 1;

        if (interest.verified) {
          acc[interest.category].verified += interest.amount;
        } else {
          acc[interest.category].unverified += interest.amount;
        }

        return acc;
      },
      {} as Record<string, unknown>
    );

    // Group by year for trend analysis
    const byYear = financialInterests.reduce(
      (acc, interest) => {
        const year = new Date(interest.date).getFullYear();
        if (!acc[year]) {
          acc[year] = {
            year,
            total: 0,
            count: 0,
            donations: 0,
            investments: 0,
            employment: 0,
            contracts: 0,
            gifts: 0,
          };
        }
        acc[year].total += interest.amount;
        acc[year].count += 1;
        acc[year][interest.category] = (acc[year][interest.category] || 0) + interest.amount;

        return acc;
      },
      {} as Record<number, any>
    );

    return {
      byIndustry: Object.values(byIndustry).sort((a, b) => b.total - a.total),
      byCategory: Object.values(byCategory).sort((a, b) => b.total - a.total),
      byYear: Object.values(byYear).sort((a, b) => a.year - b.year),
      totalAmount: financialInterests.reduce((sum, interest) => sum + interest.amount, 0),
      totalCount: financialInterests.length,
      verifiedAmount: financialInterests
        .filter(i => i.verified)
        .reduce((sum, interest) => sum + interest.amount, 0),
      unverifiedAmount: financialInterests
        .filter(i => !i.verified)
        .reduce((sum, interest) => sum + interest.amount, 0),
    };
  }, [conflictAnalysis.financialInterests]);

  // Color schemes for charts
  const industryColors = [
    'hsl(var(--civic-constitutional))',
    'hsl(var(--civic-expert))',
    'hsl(var(--civic-community))',
    'hsl(var(--civic-transparency))',
    'hsl(var(--status-moderate))',
    'hsl(var(--status-high))',
    'hsl(var(--chart-1))',
    'hsl(var(--chart-2))',
  ];

  const categoryColors = {
    donation: 'hsl(var(--civic-community))',
    investment: 'hsl(var(--civic-transparency))',
    employment: 'hsl(var(--civic-expert))',
    contract: 'hsl(var(--status-moderate))',
    gift: 'hsl(var(--status-high))',
  };

  // Risk assessment based on amounts and patterns
  const getRiskLevel = (amount: number, category: string): 'low' | 'medium' | 'high' => {
    if (category === 'gift' && amount > 1000) return 'high';
    if (category === 'donation' && amount > 50000) return 'high';
    if (category === 'investment' && amount > 100000) return 'high';
    if (amount > 25000) return 'medium';
    return 'low';
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number, total: number): string => {
    return `${((value / total) * 100).toFixed(1)}%`;
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Total Exposure</span>
            </div>
            <div className="text-2xl font-bold">{formatCurrency(financialData.totalAmount)}</div>
            <div className="text-xs text-muted-foreground">
              {financialData.totalCount} interests across {financialData.byIndustry.length}{' '}
              industries
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Building className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Top Industry</span>
            </div>
            <div className="text-2xl font-bold text-truncate">
              {financialData.byIndustry[0]?.industry || 'N/A'}
            </div>
            <div className="text-xs text-muted-foreground">
              {financialData.byIndustry[0] ? formatCurrency(financialData.byIndustry[0].total) : ''}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Verification Rate</span>
            </div>
            <div className="text-2xl font-bold">
              {formatPercentage(financialData.verifiedAmount, financialData.totalAmount)}
            </div>
            <div className="text-xs text-muted-foreground">
              {formatCurrency(financialData.verifiedAmount)} verified
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Risk Assessment</span>
            </div>
            <div className="text-2xl font-bold">
              <Badge
                variant={
                  conflictAnalysis.riskLevel === 'high'
                    ? 'destructive'
                    : conflictAnalysis.riskLevel === 'medium'
                      ? 'secondary'
                      : 'default'
                }
              >
                {(conflictAnalysis.riskLevel ?? 'low').toUpperCase()}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground">Based on exposure patterns</div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analysis Tabs */}
      <Tabs defaultValue="industry" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="industry">By Industry</TabsTrigger>
          <TabsTrigger value="category">By Category</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>

        <TabsContent value="industry" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Financial Exposure by Industry</CardTitle>
              <CardDescription>
                Breakdown of financial interests across different industry sectors
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Bar Chart */}
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={financialData.byIndustry.slice(0, 8)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="industry"
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        fontSize={12}
                      />
                      <YAxis
                        tickFormatter={value => `$${(value / 1000).toFixed(0)}K`}
                        fontSize={12}
                      />
                      <Tooltip
                        formatter={(value: number) => [formatCurrency(value), 'Amount']}
                        labelStyle={{ color: 'hsl(var(--foreground))' }}
                        contentStyle={{
                          backgroundColor: 'hsl(var(--popover))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: 'var(--radius-md)',
                        }}
                      />
                      <Bar dataKey="total" fill="hsl(var(--civic-transparency))" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Pie Chart */}
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={financialData.byIndustry.slice(0, 6)}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ industry, percent }) =>
                          `${industry}: ${(percent * 100).toFixed(1)}%`
                        }
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="total"
                      >
                        {financialData.byIndustry.slice(0, 6).map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={industryColors[index % industryColors.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => [formatCurrency(value), 'Amount']}
                        contentStyle={{
                          backgroundColor: 'hsl(var(--popover))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: 'var(--radius-md)',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Industry List */}
              <div className="mt-6 space-y-3">
                {financialData.byIndustry.map((industry, index) => (
                  <div
                    key={industry.industry}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: industryColors[index % industryColors.length] }}
                        ></div>
                        <div>
                          <div className="font-medium">{industry.industry}</div>
                          <div className="text-sm text-muted-foreground">
                            {industry.count} interests •{' '}
                            {formatPercentage(industry.verified, industry.total)} verified
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{formatCurrency(industry.total)}</div>
                      <div className="text-sm text-muted-foreground">
                        {formatPercentage(industry.total, financialData.totalAmount)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="category" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Financial Exposure by Category</CardTitle>
              <CardDescription>
                Analysis of different types of financial interests and their risk levels
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {financialData.byCategory.map(category => (
                  <div key={category.category} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{
                            backgroundColor:
                              categoryColors[category.category as keyof typeof categoryColors],
                          }}
                        ></div>
                        <div>
                          <div className="font-medium capitalize">{category.category}</div>
                          <div className="text-sm text-muted-foreground">
                            {category.count} interests
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{formatCurrency(category.total)}</div>
                        <Badge
                          variant={
                            getRiskLevel(category.total, category.category) === 'high'
                              ? 'destructive'
                              : getRiskLevel(category.total, category.category) === 'medium'
                                ? 'secondary'
                                : 'default'
                          }
                          className="text-xs"
                        >
                          {getRiskLevel(category.total, category.category)} risk
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Verified: {formatCurrency(category.verified)}</span>
                        <span>Unverified: {formatCurrency(category.unverified)}</span>
                      </div>
                      <Progress
                        value={(category.verified / category.total) * 100}
                        className="h-2"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Financial Exposure Timeline</CardTitle>
              <CardDescription>Trends in financial interests over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={financialData.byYear}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis tickFormatter={value => `$${(value / 1000).toFixed(0)}K`} />
                    <Tooltip
                      formatter={(value: number) => [formatCurrency(value), 'Amount']}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: 'var(--radius-md)',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="total"
                      stroke="hsl(var(--civic-constitutional))"
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--civic-constitutional))', strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Detailed Financial Interests</CardTitle>
              <CardDescription>
                Complete list of all financial interests with verification status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-border">
                  <thead>
                    <tr className="bg-muted">
                      <th className="border border-border p-2 text-left">Source</th>
                      <th className="border border-border p-2 text-left">Industry</th>
                      <th className="border border-border p-2 text-left">Category</th>
                      <th className="border border-border p-2 text-left">Amount</th>
                      <th className="border border-border p-2 text-left">Date</th>
                      <th className="border border-border p-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(conflictAnalysis.financialInterests ?? [])
                      .sort((a, b) => b.amount - a.amount)
                      .map((interest, index) => (
                        <tr key={interest.id} className="hover:bg-muted/50">
                          <td className="border border-border p-2">
                            <div>
                              <div className="font-medium">{interest.source}</div>
                              <div className="text-sm text-muted-foreground">
                                {interest.description}
                              </div>
                            </div>
                          </td>
                          <td className="border border-border p-2">{interest.industry}</td>
                          <td className="border border-border p-2">
                            <Badge variant="outline" className="capitalize">
                              {interest.category}
                            </Badge>
                          </td>
                          <td className="border border-border p-2 font-mono">
                            {formatCurrency(interest.amount)}
                          </td>
                          <td className="border border-border p-2">
                            {new Date(interest.date).toLocaleDateString()}
                          </td>
                          <td className="border border-border p-2">
                            <Badge variant={interest.verified ? 'default' : 'secondary'}>
                              {interest.verified ? 'Verified' : 'Unverified'}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
