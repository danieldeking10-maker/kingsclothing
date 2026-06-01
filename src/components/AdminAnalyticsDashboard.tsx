import React, { useState, useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Line,
  ComposedChart,
  Cell
} from 'recharts';
import { 
  Activity, 
  Calendar, 
  TrendingUp, 
  Award, 
  DollarSign, 
  ShoppingBag, 
  Users, 
  Zap, 
  ChevronRight,
  Clock
} from 'lucide-react';

interface AdminAnalyticsDashboardProps {
  allOrders: any[];
  allAgents: any[];
  allDesigns: any[];
  agentPerformance: any[];
}

const FABRIC_COLORS = [
  { name: 'Pitch Black', value: '#121212' },
  { name: 'Solar Orange', value: '#f27d26' },
  { name: 'Chalk White', value: '#f8f8f8' },
  { name: 'Vintage Olive', value: '#3f4e3c' },
  { name: 'Desert Sand', value: '#c2b280' },
  { name: 'Cobalt Blue', value: '#0047ab' }
];

export const AdminAnalyticsDashboard: React.FC<AdminAnalyticsDashboardProps> = ({
  allOrders,
  allAgents,
  allDesigns,
  agentPerformance
}) => {
  const [timeframe, setTimeframe] = useState<7 | 14 | 30>(30);
  const [metricTab, setMetricTab] = useState<'revenue' | 'quantity'>('revenue');

  const formatGHC = (value: number) => {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: 'GHS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  // Safe order date parser
  const parseOrderDate = (createdAt: any): Date => {
    if (!createdAt) return new Date();
    if (createdAt.toDate && typeof createdAt.toDate === 'function') {
      return createdAt.toDate();
    }
    if (createdAt.seconds) {
      return new Date(createdAt.seconds * 1000);
    }
    return new Date(createdAt);
  };

  // Filtered orders based on chosen timeframe
  const filteredOrders = useMemo(() => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - timeframe);
    cutoffDate.setHours(0, 0, 0, 0);

    return allOrders.filter(order => {
      if (order.status === 'cancelled') return false;
      const orderDate = parseOrderDate(order.createdAt);
      return orderDate >= cutoffDate;
    });
  }, [allOrders, timeframe]);

  // Compute key KPIs for current timeframe
  const kpis = useMemo(() => {
    const totalSales = filteredOrders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
    const orderCount = filteredOrders.length;
    const aov = orderCount > 0 ? totalSales / orderCount : 0;
    
    // Non-completed & non-cancelled orders for direct tracking
    const awaitingDispatch = allOrders.filter(o => 
      o.status !== 'delivered' && o.status !== 'completed' && o.status !== 'cancelled'
    ).length;

    // Top agent based on performance list
    const topAgent = agentPerformance.length > 0 ? agentPerformance[0] : null;

    return {
      totalSales,
      orderCount,
      aov,
      awaitingDispatch,
      topAgentName: topAgent ? topAgent.name : 'No Active Agents',
      topAgentRevenue: topAgent ? topAgent.totalRevenue : 0
    };
  }, [filteredOrders, allOrders, agentPerformance]);

  // Generate Daily Trend Data
  const dailyTrendData = useMemo(() => {
    const data: { dateStr: string; timestamp: number; revenue: number; volume: number }[] = [];
    const now = new Date();
    
    // Create base timeline slots
    for (let i = timeframe - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const dateStr = d.toLocaleDateString('default', { month: 'short', day: 'numeric' }).toUpperCase();
      data.push({
        dateStr,
        timestamp: d.getTime(),
        revenue: 0,
        volume: 0
      });
    }

    // Populate timeline slots
    filteredOrders.forEach(order => {
      const orderDate = parseOrderDate(order.createdAt);
      const orderDayStart = new Date(orderDate.getFullYear(), orderDate.getMonth(), orderDate.getDate()).getTime();
      const slot = data.find(day => day.timestamp === orderDayStart);
      if (slot) {
        slot.revenue += Number(order.totalAmount || 0);
        slot.volume += 1;
      }
    });

    return data;
  }, [filteredOrders, timeframe]);

  // Compute Top Performing Designs
  const topDesigns = useMemo(() => {
    const designStats: Record<string, { id: string; name: string; quantity: number; revenue: number }> = {};
    
    // Seed with current design catalog
    allDesigns.forEach(d => {
      designStats[d.id] = {
        id: d.id,
        name: d.name || 'Unnamed Design',
        quantity: d.salesCount || 0,
        revenue: (d.salesCount || 0) * (d.basePrice || 150)
      };
    });

    // Traverse orders to ensure matching live quantities & revenues
    allOrders.forEach(o => {
      if (o.status === 'cancelled') return;
      o.items?.forEach((item: any) => {
        const pId = item.productId || item.id;
        if (!pId) return;
        const qty = Number(item.quantity || 1);
        const price = Number(item.price || item.basePrice || 150);

        if (designStats[pId]) {
          designStats[pId].quantity += qty;
          designStats[pId].revenue += qty * price;
        } else {
          designStats[pId] = {
            id: pId,
            name: item.name || 'Custom Blueprint',
            quantity: qty,
            revenue: qty * price
          };
        }
      });
    });

    return Object.values(designStats)
      .sort((a, b) => b[metricTab] - a[metricTab])
      .slice(0, 5);
  }, [allDesigns, allOrders, metricTab]);

  // Top Referral Agents specifically for chart
  const agentLeaderboardData = useMemo(() => {
    return agentPerformance
      .slice(0, 5)
      .map(agent => ({
        name: agent.name || 'Anonymous Agent',
        revenue: agent.referralRevenue || 0,
        count: agent.referralCount || 0,
        growth: agent.growthRate || 0
      }));
  }, [agentPerformance]);

  return (
    <section id="royal-intelligence-hub" className="space-y-16">
      {/* Dashboard Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-white/5 pb-10">
        <div className="space-y-3">
          <div className="flex items-center space-x-3 text-accent">
            <div className="bg-accent/10 border border-accent/20 p-2.5 rounded-2xl">
              <Activity className="w-5 h-5 text-accent animate-pulse" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] italic">Real-Time Core Stream</span>
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            </div>
          </div>
          <h2 className="text-4xl md:text-5xl font-display font-black uppercase italic tracking-tighter text-white">Sovereign Intelligence<span className="text-accent">_</span></h2>
          <p className="text-white/40 text-[10px] sm:text-[11px] leading-relaxed font-black uppercase tracking-widest italic max-w-2xl">
            Live telemetry data synchronizing sales yields, market design penetration, and active marketing agent velocity.
          </p>
        </div>

        {/* Dynamic Controls */}
        <div className="flex items-center gap-3 bg-black/40 border border-white/10 p-2 rounded-3xl self-start md:self-auto shadow-xl">
          {([7, 14, 30] as const).map((days) => (
            <button
              key={days}
              id={`filter-timeframe-${days}`}
              onClick={() => setTimeframe(days)}
              className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                timeframe === days
                  ? 'bg-accent text-black font-black shadow-lg shadow-accent/20'
                  : 'text-white/40 hover:text-white'
              }`}
            >
              {days}D Frame
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {/* KPI 1 */}
        <div id="kpi-net-sales" className="bg-[#0c0c0d] border border-white/10 p-8 rounded-[2.5rem] relative overflow-hidden group shadow-2xl hover:border-accent/30 transition-all duration-300">
          <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
            <DollarSign className="w-20 h-20 text-accent" strokeWidth={1} />
          </div>
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 mb-4 flex items-center gap-1.5 italic">
            <span className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" /> Net Liquidity Yield
          </p>
          <div className="space-y-1">
            <h4 className="text-4xl font-mono font-black text-white italic tracking-tighter">{formatGHC(kpis.totalSales)}</h4>
            <p className="text-[9px] font-bold uppercase tracking-widest text-white/20 italic">{kpis.orderCount} Orders Fulfilled</p>
          </div>
        </div>

        {/* KPI 2 */}
        <div id="kpi-aov" className="bg-[#0c0c0d] border border-white/10 p-8 rounded-[2.5rem] relative overflow-hidden group shadow-2xl hover:border-accent/30 transition-all duration-300">
          <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
            <TrendingUp className="w-20 h-20 text-accent" strokeWidth={1} />
          </div>
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 mb-4 flex items-center gap-1.5 italic">
            Average Ticket Value
          </p>
          <div className="space-y-1">
            <h4 className="text-4xl font-mono font-black text-accent italic tracking-tighter">{formatGHC(kpis.aov)}</h4>
            <p className="text-[9px] font-bold uppercase tracking-widest text-white/20 italic">Transaction Average</p>
          </div>
        </div>

        {/* KPI 3 */}
        <div id="kpi-dispatch" className="bg-[#0c0c0d] border border-white/10 p-8 rounded-[2.5rem] relative overflow-hidden group shadow-2xl hover:border-accent/30 transition-all duration-300">
          <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
            <ShoppingBag className="w-20 h-20 text-accent" strokeWidth={1} />
          </div>
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 mb-4 flex items-center gap-1.5 italic">
            Awaiting Dispatch
          </p>
          <div className="space-y-1">
            <h4 className="text-4xl font-mono font-black text-white italic tracking-tighter">{kpis.awaitingDispatch}</h4>
            <p className="text-[9px] font-bold uppercase tracking-widest text-white/20 italic">Active Operations</p>
          </div>
        </div>

        {/* KPI 4 */}
        <div id="kpi-primary-referrer" className="bg-[#0c0c0d] border border-white/10 p-8 rounded-[2.5rem] relative overflow-hidden group shadow-2xl hover:border-accent/30 transition-all duration-300">
          <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
            <Award className="w-20 h-20 text-accent" strokeWidth={1} />
          </div>
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 mb-4 flex items-center gap-1.5 italic">
            Top Referral Node
          </p>
          <div className="space-y-1">
            <h4 className="text-[15px] font-display font-black text-white uppercase italic leading-none mb-1 truncate">{kpis.topAgentName}</h4>
            <p className="text-xs font-mono font-bold text-accent italic tracking-tighter mt-1">{formatGHC(kpis.topAgentRevenue)} Yield</p>
          </div>
        </div>
      </div>

      {/* Main Realtime Chart Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Daily Sales Telemetry (Line & Area) */}
        <div id="chart-daily-sales" className="lg:col-span-12 bg-[#0c0c0d] border border-white/10 p-8 md:p-12 rounded-[3.5rem] shadow-2xl relative overflow-hidden flex flex-col justify-between">
          <div className="absolute right-0 top-0 p-12 opacity-5 pointer-events-none">
            <Activity className="w-52 h-52 text-accent" strokeWidth={0.5} />
          </div>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 pb-6 border-b border-white/5">
            <div>
              <span className="text-accent text-[8px] font-black uppercase tracking-[0.3em] mb-1.5 block">Time-Series Velocity</span>
              <h3 className="text-2xl font-display font-black uppercase italic text-white tracking-widest">Daily Sales Feed</h3>
              <p className="text-[9px] font-bold uppercase tracking-widest text-white/20">Chronological revenue & order volume trend matrix</p>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 bg-accent rounded-full" />
                <span className="text-[9px] font-black uppercase text-white/40 tracking-wider">Revenue GHS</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 bg-white/30 border border-dashed border-white/60 rounded-full" />
                <span className="text-[9px] font-black uppercase text-white/40 tracking-wider">Order Volume</span>
              </div>
            </div>
          </div>

          <div className="h-[400px] w-full">
            {dailyTrendData.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-white/10 space-y-3">
                <Clock className="w-12 h-12 animate-pulse" />
                <p className="text-xs font-black uppercase tracking-widest">Awaiting snapshot sequence...</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="glowSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f27d26" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#f27d26" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                  
                  <XAxis 
                    dataKey="dateStr" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 9, fontWeight: 900 }} 
                    dy={10}
                  />
                  
                  <YAxis 
                    yAxisId="revenue"
                    axisLine={false} 
                    tickLine={false} 
                    tickFormatter={(v) => `₵${v}`}
                    tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 9, fontWeight: 900 }}
                  />

                  <YAxis 
                    yAxisId="volume"
                    orientation="right"
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 9, fontWeight: 900 }}
                  />

                  <Tooltip 
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const rev = payload.find(p => p.dataKey === 'revenue')?.value || 0;
                        const vol = payload.find(p => p.dataKey === 'volume')?.value || 0;
                        return (
                          <div className="bg-[#0a0a0b] border border-white/15 p-5 rounded-2xl shadow-2xl text-[10px] font-black uppercase space-y-2">
                            <p className="text-white/40 border-b border-white/5 pb-1 font-mono">{label}</p>
                            <div className="flex justify-between gap-6">
                              <span className="text-white/50">Daily Volume:</span>
                              <span className="text-white">{vol} Orders</span>
                            </div>
                            <div className="flex justify-between gap-6">
                              <span className="text-accent">Gross Yield:</span>
                              <span className="text-accent">{formatGHC(Number(rev))}</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />

                  <Area 
                    yAxisId="revenue"
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#f27d26" 
                    strokeWidth={4}
                    fillOpacity={1} 
                    fill="url(#glowSales)" 
                    animationDuration={1500}
                  />

                  <Line 
                    yAxisId="volume"
                    type="monotone" 
                    dataKey="volume" 
                    stroke="rgba(255,255,255,0.3)" 
                    strokeWidth={2.5}
                    strokeDasharray="4 4"
                    dot={{ fill: '#ffffff', r: 3, strokeWidth: 0 }}
                    activeDot={{ r: 5, stroke: '#f27d26', strokeWidth: 2 }}
                    animationDuration={2000}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Top Performing Designs */}
        <div id="chart-top-designs" className="lg:col-span-6 bg-[#0c0c0d] border border-white/10 p-8 rounded-[3rem] shadow-2xl relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between gap-6 mb-8 pb-4 border-b border-white/5">
            <div>
              <span className="text-accent text-[8px] font-black uppercase tracking-[0.3em] mb-1 block">Yield Penetration</span>
              <h3 className="text-xl font-display font-black uppercase italic text-white">Top 5 Blueprints</h3>
            </div>
            
            <div className="flex items-center gap-1.5 bg-black/40 border border-white/5 p-1 rounded-2xl">
              <button
                id="btn-metric-revenue"
                onClick={() => setMetricTab('revenue')}
                className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all ${
                  metricTab === 'revenue' ? 'bg-accent/15 text-accent border border-accent/20' : 'text-white/30 hover:text-white'
                }`}
              >
                GHS
              </button>
              <button
                id="btn-metric-quantity"
                onClick={() => setMetricTab('quantity')}
                className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all ${
                  metricTab === 'quantity' ? 'bg-accent/15 text-accent border border-accent/20' : 'text-white/30 hover:text-white'
                }`}
              >
                Qty
              </button>
            </div>
          </div>

          <div className="h-[280px] w-full">
            {topDesigns.length === 0 ? (
              <div className="h-full flex items-center justify-center text-white/5 font-black uppercase tracking-widest text-[10px]">
                No catalog blueprints uploaded under yield tracking.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topDesigns} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" horizontal={false} />
                  <XAxis 
                    type="number" 
                    axisLine={false} 
                    tickLine={false}
                    tickFormatter={(v) => metricTab === 'revenue' ? `₵${v}` : v}
                    tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 9, fontWeight: 900 }}
                  />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    axisLine={false} 
                    tickLine={false}
                    width={100}
                    tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 8, fontWeight: 900 }}
                  />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-[#0a0a0b] border border-white/15 p-4 rounded-xl text-[9px] uppercase font-black space-y-1">
                            <p className="text-white/40 pb-0.5">{data.name}</p>
                            <p className="text-accent">Gross Yield: {formatGHC(data.revenue)}</p>
                            <p className="text-white">Quantity Shipped: {data.quantity} units</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar 
                    dataKey={metricTab} 
                    radius={[0, 6, 6, 0]}
                    barSize={16}
                    animationDuration={1500}
                  >
                    {topDesigns.map((entry, index) => {
                      const colors = ['#f27d26', '#df6c1c', '#cf5d13', '#bf4e0c', '#ae3f06'];
                      return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Agent Referral Activity */}
        <div id="chart-agent-activity" className="lg:col-span-6 bg-[#0c0c0d] border border-white/10 p-8 rounded-[3rem] shadow-2xl relative overflow-hidden flex flex-col justify-between">
          <div className="mb-8 pb-4 border-b border-white/5">
            <span className="text-accent text-[8px] font-black uppercase tracking-[0.3em] mb-1 block">Network Authority</span>
            <h3 className="text-xl font-display font-black uppercase italic text-white">Agent Referral Leaderboard</h3>
            <p className="text-[9px] font-bold uppercase tracking-widest text-white/20">Referral volume vs. gross yield generate mapping</p>
          </div>

          <div className="h-[280px] w-full">
            {agentLeaderboardData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-white/5 font-black uppercase tracking-widest text-[10px]">
                No verified nodes operating under active tracking.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={agentLeaderboardData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false}
                    tickFormatter={(v) => v.split(' ')[0]}
                    tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9, fontWeight: 900 }}
                  />
                  <YAxis 
                    yAxisId="yield"
                    axisLine={false} 
                    tickLine={false}
                    tickFormatter={(v) => `₵${v}`}
                    tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9, fontWeight: 900 }}
                  />
                  <YAxis 
                    yAxisId="volume"
                    orientation="right"
                    axisLine={false} 
                    tickLine={false}
                    tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9, fontWeight: 900 }}
                  />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-[#0a0a0b] border border-white/15 p-4 rounded-xl text-[9px] uppercase font-black space-y-1">
                            <p className="text-white/40 pb-0.5">{data.name}</p>
                            <p className="text-accent">Referral Yield: {formatGHC(data.revenue)}</p>
                            <p className="text-white">Active Referrals: {data.count} transition nodes</p>
                            <p className="text-white/60">Utility Rank Score: {Math.round(data.growth)}%</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar 
                    yAxisId="yield" 
                    dataKey="revenue" 
                    fill="#f27d26" 
                    radius={[6, 6, 0, 0]} 
                    barSize={20}
                    animationDuration={1500}
                  />
                  <Line 
                    yAxisId="volume" 
                    type="monotone" 
                    dataKey="count" 
                    stroke="#ffffff" 
                    strokeWidth={3}
                    dot={{ fill: '#ffffff', stroke: '#f27d26', strokeWidth: 2, r: 4 }}
                    animationDuration={2000}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>

      {/* Auxiliary Executive Summary */}
      <div className="bg-[#0c0c0d] border border-white/10 p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
        <h4 className="text-xs font-black uppercase tracking-[0.3em] text-accent mb-6 flex items-center gap-2">
          <Zap className="w-4.5 h-4.5" /> High Penetration Ecosystem Feed
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* List of top agent nodes */}
          <div className="space-y-6">
            <h5 className="text-[10px] font-black uppercase tracking-widest text-white/40 italic">Active Marketing Node Leadership</h5>
            <div className="space-y-3">
              {agentPerformance.slice(0, 3).map((agent, i) => (
                <div key={agent.id} className="flex justify-between items-center p-6 bg-white/2 rounded-2xl border border-white/5 hover:border-accent/20 transition-all">
                  <div className="flex items-center space-x-4">
                    <span className="text-xs font-mono font-black text-white/20">0{i+1}</span>
                    <div>
                      <p className="text-xs font-black uppercase text-white tracking-widest mb-0.5">{agent.name}</p>
                      <p className="text-[8px] font-black uppercase text-white/30 tracking-tight">Code: {agent.referralCode || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-mono font-black text-accent">{formatGHC(agent.referralRevenue)}</p>
                    <p className="text-[8px] font-black uppercase text-white/20 tracking-tighter">Referral Revenue</p>
                  </div>
                </div>
              ))}
              {agentPerformance.length === 0 && (
                <p className="text-[10px] text-white/25 italic uppercase tracking-widest">No agent nodes established yet.</p>
              )}
            </div>
          </div>

          {/* List of high performing design products */}
          <div className="space-y-6">
            <h5 className="text-[10px] font-black uppercase tracking-widest text-white/40 italic">Global Catalog Yield Matrix</h5>
            <div className="space-y-3">
              {topDesigns.slice(0, 3).map((design, i) => (
                <div key={design.id} className="flex justify-between items-center p-6 bg-white/2 rounded-2xl border border-white/5 hover:border-accent/20 transition-all">
                  <div className="flex items-center space-x-4">
                    <span className="text-xs font-mono font-black text-white/20">0{i+1}</span>
                    <div>
                      <p className="text-xs font-black uppercase text-white tracking-widest mb-0.5 truncate max-w-[140px]">{design.name}</p>
                      <p className="text-[8px] font-black uppercase text-white/30 tracking-tight">{design.quantity} Shipped Volumes</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-mono font-black text-accent">{formatGHC(design.revenue)}</p>
                    <p className="text-[8px] font-black uppercase text-white/20 tracking-tighter">Gross Yield</p>
                  </div>
                </div>
              ))}
              {topDesigns.length === 0 && (
                <p className="text-[10px] text-white/25 italic uppercase tracking-widest">No custom products logged in current catalogs.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
