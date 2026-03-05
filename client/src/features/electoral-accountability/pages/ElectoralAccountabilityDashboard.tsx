/**
 * Electoral Accountability Dashboard Page
 * 
 * Main dashboard for Electoral Accountability Engine
 */

import React, { useState } from 'react';
import { MPScorecard } from '../ui/mp-scorecard/MPScorecard';
import { VotingRecordTimeline } from '../ui/mp-scorecard/VotingRecordTimeline';
import { Shield, TrendingUp, Users, AlertTriangle } from 'lucide-react';

export function ElectoralAccountabilityDashboard() {
  // TODO: Get these from route params or user context
  const [sponsorId] = useState('demo-sponsor-id');
  const [constituency] = useState('Westlands');

  const handleViewDetails = () => {
    console.log('View details clicked');
    // TODO: Navigate to detailed analysis page
  };

  const handleCreateCampaign = () => {
    console.log('Create campaign clicked');
    // TODO: Open campaign creation modal
  };

  const handleVoteClick = (record: any) => {
    console.log('Vote clicked:', record);
    // TODO: Show vote details modal
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Shield className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Electoral Accountability Engine
              </h1>
              <p className="text-gray-600 mt-1">
                Converting transparency into electoral consequence
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Info Banner */}
          <div className="rounded-lg bg-blue-50 border-2 border-blue-200 p-6">
            <div className="flex items-start gap-4">
              <AlertTriangle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">
                  What is Electoral Accountability?
                </h3>
                <p className="text-sm text-blue-800 leading-relaxed">
                  This feature tracks the "accountability distance" between what constituents want 
                  and how their MP votes. Unlike other platforms that measure engagement, we measure 
                  outcomes: MPs who changed votes under pressure, bills challenged in court, and 
                  candidates who lost seats after voting records became campaign material.
                </p>
              </div>
            </div>
          </div>

          {/* MP Scorecard */}
          <section>
            <MPScorecard
              sponsorId={sponsorId}
              constituency={constituency}
              onViewDetails={handleViewDetails}
              onCreateCampaign={handleCreateCampaign}
            />
          </section>

          {/* Voting Record Timeline */}
          <section>
            <VotingRecordTimeline
              sponsorId={sponsorId}
              constituency={constituency}
              includeGapAnalysis={true}
              onVoteClick={handleVoteClick}
            />
          </section>

          {/* Quick Stats */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <TrendingUp className="w-6 h-6 text-blue-600" />
                <h3 className="font-semibold text-gray-900">Electoral Impact</h3>
              </div>
              <p className="text-sm text-gray-600">
                Track how accountability campaigns influence MP behavior and electoral outcomes.
              </p>
            </div>

            <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <Users className="w-6 h-6 text-green-600" />
                <h3 className="font-semibold text-gray-900">Community Voice</h3>
              </div>
              <p className="text-sm text-gray-600">
                Ward-level sentiment aggregation shows what constituents actually want.
              </p>
            </div>

            <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <Shield className="w-6 h-6 text-purple-600" />
                <h3 className="font-semibold text-gray-900">Data for Action</h3>
              </div>
              <p className="text-sm text-gray-600">
                Export accountability data for civil society, legal teams, and campaign strategists.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
