import { create } from 'zustand'

const initialWorkspaces = [
  {
    id: 'ws-1',
    name: 'US Federal Cloud Infrastructure Upgrade',
    sector: 'IT Services',
    budget: '$1,850,000',
    deadline: '2026-06-25',
    status: 'Analysing',
    winProbability: 76,
    pageCount: 64,
    requirementsCount: 12,
    gapCount: 2,
    complianceRate: 83,
    creationDate: '2026-06-01',
    riskScore: 28,
    strengths: [
      'Strong historical performance with US Federal clients (4 similar contracts completed).',
      'Full FedRAMP High certification matches RFP cloud constraints.',
      'Key personnel already possess active security clearances.'
    ],
    risks: [
      'Strict 6-month delivery timeline leaves little margin for deployment delays.',
      'Budget constraints are on the lower limit of our standard pricing tier.'
    ],
    aiReasoning: 'This opportunity presents a strong alignment with our technical capabilities, especially our FedRAMP solutions. The critical path risk is the aggressive timeline; however, our pre-configured architecture templates should mitigate this. We recommend a GO with high confidence.',
    scoreBreakdown: [
      { name: 'Budget Fit', score: 65, benchmark: 70, delta: -5 },
      { name: 'Compliance %', score: 85, benchmark: 80, delta: 5 },
      { name: 'Past Win Rate', score: 90, benchmark: 60, delta: 30 },
      { name: 'Response Time', score: 70, benchmark: 75, delta: -5 },
      { name: 'Sector Match', score: 95, benchmark: 70, delta: 25 },
      { name: 'Gap Count', score: 80, benchmark: 70, delta: 10 }
    ],
    requirements: [
      {
        id: 'REQ-01',
        text: 'The system must support multi-factor authentication (MFA) via PIV/CAC cards and FedRAMP High standards.',
        category: 'Security',
        mandatory: true,
        matchScore: 96,
        status: 'PASS',
        evidence: [
          { id: 'CAP-102', title: 'FedRAMP SSO & Identity Gateway', description: 'Built and certified an identity and access management gateway supporting PIV/CAC for USDA.', match: 96 },
          { id: 'CAP-105', title: 'Department of Energy Portal', description: 'Deployed secure multi-factor authentication system with active directory integration.', match: 88 }
        ]
      },
      {
        id: 'REQ-02',
        text: 'Zero-downtime failover across at least two geographically isolated US-based cloud zones is required.',
        category: 'Infrastructure',
        mandatory: true,
        matchScore: 92,
        status: 'PASS',
        evidence: [
          { id: 'CAP-101', title: 'Multi-Region Cloud Infrastructure', description: 'Engineered active-active multi-region AWS environments for Federal Aviation administration.', match: 94 }
        ]
      },
      {
        id: 'REQ-03',
        text: 'Compliance with NIST SP 800-53 Revision 5 security controls must be audited and documented.',
        category: 'Compliance',
        mandatory: true,
        matchScore: 89,
        status: 'PASS',
        evidence: [
          { id: 'CAP-102', title: 'FedRAMP SSO & Identity Gateway', description: 'Compliance audit documentation completed for USDA under NIST SP 800-53.', match: 89 }
        ]
      },
      {
        id: 'REQ-04',
        text: 'Automatic data scrubbing and anonymization of PII data before logs are output to external monitoring tools.',
        category: 'Data Privacy',
        mandatory: false,
        matchScore: 45,
        status: 'GAP',
        evidence: [
          { id: 'CAP-106', title: 'Anonymized Health Logging', description: 'Developed PII redaction pipeline for healthcare analytical reporting systems.', match: 72 }
        ]
      },
      {
        id: 'REQ-05',
        text: 'Real-time dashboard visualization showing resource consumption metrics updated every 5 seconds.',
        category: 'Performance',
        mandatory: false,
        matchScore: 78,
        status: 'PASS',
        evidence: [
          { id: 'CAP-104', title: 'Real-time Telemetry Dashboard', description: 'Designed high-frequency telemetry system handling 10k messages/sec for logistics monitoring.', match: 84 }
        ]
      }
    ],
    proposalSections: [
      {
        id: 'SEC-01',
        requirementId: 'REQ-01',
        heading: 'Section 4.1: Secure Multi-Factor Authentication (MFA) Strategy',
        text: 'Our proposed identity framework utilizes a fully FedRAMP High certified single sign-on (SSO) gateway. It integrates natively with federal PIV/CAC cards. When users insert their PIV/CAC card, the client certificate is validated against the federal OCSP responders, guaranteeing cryptographic security. Multi-factor checks are enforced at every login boundary to prevent unauthorized lateral traversal. Furthermore, we leverage our proven FedRAMP SSO architecture, which was successfully audited and deployed at the USDA.',
        wordCount: 78,
        targetWordCount: 150,
        approved: 'Approved',
        versionHistory: [
          { timestamp: '2026-06-03 14:20', editor: 'AI Engine', text: 'Our proposed identity framework utilizes a fully FedRAMP High certified single sign-on (SSO) gateway...' }
        ]
      },
      {
        id: 'SEC-02',
        requirementId: 'REQ-02',
        heading: 'Section 4.2: High Availability & Multi-Region Failover Architecture',
        text: 'To ensure zero-downtime, our architecture implements an active-active deployment across AWS GovCloud East and West. Traffic is dynamically balanced using latency-based DNS routing. In the event of a primary zone failure, our automated Route 53 health-check configuration triggers immediate failover to the secondary region within 12 seconds. Session states are synchronized in real-time using global database replication, ensuring that end-users experience no disruption in service.',
        wordCount: 82,
        targetWordCount: 180,
        approved: 'Draft',
        versionHistory: []
      },
      {
        id: 'SEC-03',
        requirementId: 'REQ-04',
        heading: 'Section 4.3: Logging & PII Data Scrubbing Protocol',
        text: 'Currently, our standard logging pipeline captures system metrics and events. We will implement an automated data filter middleware within the logging module. This middleware will scan all outgoing log outputs against regular expression patterns representing PII (such as Social Security Numbers, phone numbers, and emails) and automatically replace them with hashed tokens. This ensures compliance with privacy policies while allowing log aggregators to remain fully active.',
        wordCount: 75,
        targetWordCount: 120,
        approved: 'Pending',
        versionHistory: []
      }
    ]
  },
  {
    id: 'ws-2',
    name: 'HealthCare Patient Portal v2',
    sector: 'Healthcare',
    budget: '$920,000',
    deadline: '2026-07-10',
    status: 'Draft',
    winProbability: 58,
    pageCount: 38,
    requirementsCount: 8,
    gapCount: 1,
    complianceRate: 87,
    creationDate: '2026-06-08',
    riskScore: 40,
    strengths: [
      'Extensive HIPAA security templates.',
      'High client satisfaction rating on past portal development projects.'
    ],
    risks: [
      'Requires integrations with legacy Epic Systems EHR, which we have not executed directly in the past 24 months.'
    ],
    aiReasoning: 'A viable opportunity in our core healthcare vertical. The primary technical challenge is the legacy EHR integration. We have marked this as a GAP and recommend leveraging external API middleware specialists to secure the bid.',
    scoreBreakdown: [
      { name: 'Budget Fit', score: 80, benchmark: 70, delta: 10 },
      { name: 'Compliance %', score: 87, benchmark: 80, delta: 7 },
      { name: 'Past Win Rate', score: 50, benchmark: 60, delta: -10 },
      { name: 'Response Time', score: 60, benchmark: 75, delta: -15 },
      { name: 'Sector Match', score: 85, benchmark: 70, delta: 15 },
      { name: 'Gap Count', score: 70, benchmark: 70, delta: 0 }
    ],
    requirements: [
      {
        id: 'REQ-201',
        text: 'All patient data must be encrypted in transit and at rest in strict compliance with HIPAA Security Rules.',
        category: 'Compliance',
        mandatory: true,
        matchScore: 98,
        status: 'PASS',
        evidence: [
          { id: 'CAP-103', title: 'HIPAA Patient Telehealth System', description: 'Deployed patient dashboard with end-to-end AES-256 encryption at rest and TLS 1.3 in transit.', match: 98 }
        ]
      },
      {
        id: 'REQ-202',
        text: 'Integration with Epic Systems EHR APIs via HL7 or FHIR standards is mandatory.',
        category: 'Integration',
        mandatory: true,
        matchScore: 35,
        status: 'GAP',
        evidence: []
      }
    ],
    proposalSections: [
      {
        id: 'SEC-201',
        requirementId: 'REQ-201',
        heading: 'Section 1.1: Patient Data Cryptography and HIPAA Standards',
        text: 'We employ AES-256 encryption for all databases containing patient health records, coupled with automatic key rotation via AWS KMS. In transit, we enforce TLS 1.3 and reject legacy protocols. Audit logging is permanently active, tracking every data access event with timestamped user attribution to ensure compliance with HIPAA Security standards.',
        wordCount: 52,
        targetWordCount: 150,
        approved: 'Draft',
        versionHistory: []
      }
    ]
  },
  {
    id: 'ws-3',
    name: 'State Transit Logistics Automation',
    sector: 'Logistics',
    budget: '$2,400,000',
    deadline: '2026-06-15',
    status: 'In Review',
    winProbability: 88,
    pageCount: 112,
    requirementsCount: 20,
    gapCount: 0,
    complianceRate: 100,
    creationDate: '2026-05-12',
    riskScore: 12,
    strengths: [
      'Direct Match with our Real-Time Telemetry Dashboard system.',
      'Excellent price positioning compared to municipal budget parameters.'
    ],
    risks: [
      'None identified; extremely strong past performance match.'
    ],
    aiReasoning: 'This is a premium opportunity. Our technical match is at 100% compliance. The proposal draft is complete and has been optimized. Strongly recommend a final push to submit.',
    scoreBreakdown: [
      { name: 'Budget Fit', score: 90, benchmark: 70, delta: 20 },
      { name: 'Compliance %', score: 100, benchmark: 80, delta: 20 },
      { name: 'Past Win Rate', score: 85, benchmark: 60, delta: 25 },
      { name: 'Response Time', score: 90, benchmark: 75, delta: 15 },
      { name: 'Sector Match', score: 95, benchmark: 70, delta: 25 },
      { name: 'Gap Count', score: 100, benchmark: 70, delta: 30 }
    ],
    requirements: [
      {
        id: 'REQ-301',
        text: 'Real-time tracking of at least 500 municipal transit vehicles with dashboard updates in under 2 seconds.',
        category: 'Telemetry',
        mandatory: true,
        matchScore: 98,
        status: 'PASS',
        evidence: [
          { id: 'CAP-104', title: 'Real-time Telemetry Dashboard', description: 'Designed high-frequency telemetry system handling 10k messages/sec for logistics monitoring.', match: 98 }
        ]
      }
    ],
    proposalSections: [
      {
        id: 'SEC-301',
        requirementId: 'REQ-301',
        heading: 'Section 2.1: High-Throughput Vehicle Telemetry Pipeline',
        text: 'Our proposed solution uses a serverless event bus built on Apache Kafka and AWS Lambda. It supports ingesting message packets from up to 2,000 active vehicle transponders simultaneously. The telemetry feed updates our custom dashboard dynamically in less than 750ms, exceeding the 2-second SLA. This architecture leverages our proven fleet deployment framework which handles 10,000 requests per second daily.',
        wordCount: 68,
        targetWordCount: 100,
        approved: 'Approved',
        versionHistory: []
      }
    ]
  }
]

const initialCapabilities = [
  {
    id: 'CAP-101',
    domain: 'Cloud Infrastructure',
    certification: 'None',
    year: 2024,
    contractValue: 1200000,
    duration: '18 Months',
    clientType: 'State Municipality',
    summary: 'Engineered a highly resilient multi-region AWS cloud setup for municipal transit routing. Included automatic disaster recovery failovers, dynamic load balancing, and auto-scaling to handle peak rush-hour loads.',
    proposalsCited: ['State Transit Logistics Automation']
  },
  {
    id: 'CAP-102',
    domain: 'Identity & Access Management',
    certification: 'FedRAMP High',
    year: 2025,
    contractValue: 950000,
    duration: '12 Months',
    clientType: 'Federal Government',
    summary: 'Designed and implemented an enterprise single sign-on (SSO) gateway with multi-factor authentication (MFA) supporting federal PIV/CAC cards. Deployed and audited under FedRAMP High guidelines for the USDA.',
    proposalsCited: ['US Federal Cloud Infrastructure Upgrade']
  },
  {
    id: 'CAP-103',
    domain: 'Data Cryptography',
    certification: 'ISO 27001',
    year: 2024,
    contractValue: 800000,
    duration: '9 Months',
    clientType: 'Commercial Healthcare',
    summary: 'Created a patient portal database with end-to-end data encryption using AES-256 for data at rest and TLS 1.3 for data in transit. Certified to comply with all HIPAA HIPAA Security rules.',
    proposalsCited: ['HealthCare Patient Portal v2']
  },
  {
    id: 'CAP-104',
    domain: 'Real-Time Telemetry',
    certification: 'SOC 2 Type II',
    year: 2025,
    contractValue: 1450000,
    duration: '14 Months',
    clientType: 'Logistics',
    summary: 'Built a high-frequency real-time dashboard telemetry system ingesting and plotting GPS data points from over 1,500 active assets. Achieved sub-second data propagation and live updates.',
    proposalsCited: ['State Transit Logistics Automation', 'US Federal Cloud Infrastructure Upgrade']
  },
  {
    id: 'CAP-105',
    domain: 'Access Security',
    certification: 'FedRAMP High',
    year: 2023,
    contractValue: 700000,
    duration: '10 Months',
    clientType: 'Federal Government',
    summary: 'Implemented centralized Active Directory integration and multi-factor authentication policies for high-security Department of Energy field portals.',
    proposalsCited: ['US Federal Cloud Infrastructure Upgrade']
  },
  {
    id: 'CAP-106',
    domain: 'Data Privacy',
    certification: 'SOC 2 Type II',
    year: 2024,
    contractValue: 500000,
    duration: '6 Months',
    clientType: 'Commercial Healthcare',
    summary: 'Designed custom middleware to parse system logs, run regex audits, and redact PII (Social Security Numbers, Phone Numbers, Emails) prior to pushing reports to public log targets.',
    proposalsCited: []
  }
]

export const useWorkspaceStore = create((set, get) => ({
  workspaces: initialWorkspaces,
  capabilities: initialCapabilities,
  activeWorkspaceId: 'ws-1',
  selectedRequirementId: 'REQ-01',

  // Workspace Actions
  setActiveWorkspace: (id) => set({ activeWorkspaceId: id, selectedRequirementId: null }),
  setSelectedRequirement: (id) => set({ selectedRequirementId: id }),

  createWorkspace: (workspaceData) => set((state) => {
    const newId = `ws-${Date.now()}`
    const newWorkspace = {
      id: newId,
      name: workspaceData.name || 'New Workspace RFP',
      sector: workspaceData.sector || 'IT Services',
      budget: workspaceData.budget || '$500,000',
      deadline: workspaceData.deadline || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'Draft',
      winProbability: 50,
      pageCount: 1,
      requirementsCount: 0,
      gapCount: 0,
      complianceRate: 100,
      creationDate: new Date().toISOString().split('T')[0],
      riskScore: 20,
      strengths: ['Flexible project structure.', 'Experienced internal team.'],
      risks: ['Initial startup alignment risks.'],
      aiReasoning: 'This project is in its initial draft stage. Upload an RFP document to begin analysis and obtain matched capabilities.',
      scoreBreakdown: [
        { name: 'Budget Fit', score: 60, benchmark: 70, delta: -10 },
        { name: 'Compliance %', score: 100, benchmark: 80, delta: 20 },
        { name: 'Past Win Rate', score: 50, benchmark: 60, delta: -10 },
        { name: 'Response Time', score: 70, benchmark: 75, delta: -5 },
        { name: 'Sector Match', score: 60, benchmark: 70, delta: -10 },
        { name: 'Gap Count', score: 100, benchmark: 70, delta: 30 }
      ],
      requirements: [],
      proposalSections: []
    }
    return {
      workspaces: [...state.workspaces, newWorkspace],
      activeWorkspaceId: newId,
      selectedRequirementId: null
    }
  }),

  deleteWorkspace: (id) => set((state) => {
    const updated = state.workspaces.filter(ws => ws.id !== id)
    let nextActive = state.activeWorkspaceId
    if (state.activeWorkspaceId === id) {
      nextActive = updated.length > 0 ? updated[0].id : null
    }
    return {
      workspaces: updated,
      activeWorkspaceId: nextActive,
      selectedRequirementId: null
    }
  }),

  duplicateWorkspace: (id) => set((state) => {
    const target = state.workspaces.find(ws => ws.id === id)
    if (!target) return {}
    const duplicate = {
      ...target,
      id: `ws-${Date.now()}`,
      name: `${target.name} (Copy)`,
      status: 'Draft',
      creationDate: new Date().toISOString().split('T')[0]
    }
    return {
      workspaces: [...state.workspaces, duplicate]
    }
  }),

  updateWorkspaceStatus: (id, newStatus) => set((state) => ({
    workspaces: state.workspaces.map(ws => 
      ws.id === id ? { ...ws, status: newStatus } : ws
    )
  })),

  // Compliance actions
  updateRequirementStatus: (workspaceId, reqId, newStatus) => set((state) => {
    const updatedWorkspaces = state.workspaces.map(ws => {
      if (ws.id !== workspaceId) return ws
      
      const updatedReqs = ws.requirements.map(req => 
        req.id === reqId ? { ...req, status: newStatus } : req
      )

      // Re-calculate gaps and compliance metrics
      const gapCount = updatedReqs.filter(r => r.status === 'GAP').length
      const passCount = updatedReqs.filter(r => r.status === 'PASS').length
      const total = updatedReqs.length
      const complianceRate = total > 0 ? Math.round((passCount / total) * 100) : 100

      // Adjust winProbability and radar scores dynamically based on compliance changes
      const complianceScoreObj = ws.scoreBreakdown.map(axis => {
        if (axis.name === 'Compliance %') {
          return { ...axis, score: complianceRate, delta: complianceRate - axis.benchmark }
        }
        if (axis.name === 'Gap Count') {
          const gapScore = Math.max(0, 100 - (gapCount * 15))
          return { ...axis, score: gapScore, delta: gapScore - axis.benchmark }
        }
        return axis
      })

      const averageScore = Math.round(complianceScoreObj.reduce((acc, curr) => acc + curr.score, 0) / complianceScoreObj.length)

      return {
        ...ws,
        requirements: updatedReqs,
        gapCount,
        complianceRate,
        scoreBreakdown: complianceScoreObj,
        winProbability: Math.min(100, Math.max(10, averageScore))
      }
    })

    return { workspaces: updatedWorkspaces }
  }),

  // Add dummy requirements after upload RFP simulation
  populateRequirementsAfterUpload: (workspaceId) => set((state) => {
    const requirements = [
      {
        id: 'REQ-NEW-01',
        text: 'The system must support secure REST API endpoints with TLS 1.3 encryption and OAuth2 access control.',
        category: 'Security',
        mandatory: true,
        matchScore: 94,
        status: 'PASS',
        evidence: [
          { id: 'CAP-103', title: 'HIPAA Patient Telehealth System', description: 'Implemented secure RESTful FHIR APIs under TLS 1.3.', match: 94 }
        ]
      },
      {
        id: 'REQ-NEW-02',
        text: 'System dashboard must load in under 1.5 seconds for users operating with high latency networks.',
        category: 'Performance',
        mandatory: false,
        matchScore: 82,
        status: 'PASS',
        evidence: [
          { id: 'CAP-104', title: 'Real-time Telemetry Dashboard', description: 'Developed highly optimized dashboard load filters.', match: 82 }
        ]
      },
      {
        id: 'REQ-NEW-03',
        text: 'All audit files must be backed up to off-site systems on an hourly basis and encrypted.',
        category: 'Backup',
        mandatory: true,
        matchScore: 40,
        status: 'GAP',
        evidence: []
      }
    ]

    const proposalSections = [
      {
        id: 'SEC-NEW-01',
        requirementId: 'REQ-NEW-01',
        heading: 'Section 1.1: REST API Standards & Access Control',
        text: 'Our backend services expose REST API endpoints that require authentication through an OAuth 2.0 authorization server. All connections are secured via TLS 1.3. Cryptographic suites are audited regularly. We utilize JSON Web Tokens (JWT) signed with RSA-256 for credential verification.',
        wordCount: 42,
        targetWordCount: 100,
        approved: 'Draft',
        versionHistory: []
      },
      {
        id: 'SEC-NEW-02',
        requirementId: 'REQ-NEW-02',
        heading: 'Section 1.2: Dashboard Load Optimization Strategy',
        text: 'To meet the 1.5-second load SLA, the frontend application implements strict lazy loading of page assets, client-side route caching, and lightweight SVG charting widgets. API payloads are compressed using GZIP/Brotli, and static assets are distributed globally via CDN nodes.',
        wordCount: 41,
        targetWordCount: 120,
        approved: 'Draft',
        versionHistory: []
      }
    ]

    return {
      workspaces: state.workspaces.map(ws => {
        if (ws.id !== workspaceId) return ws
        return {
          ...ws,
          requirements,
          proposalSections,
          requirementsCount: requirements.length,
          gapCount: 1,
          complianceRate: 66,
          pageCount: 18,
          winProbability: 62,
          scoreBreakdown: [
            { name: 'Budget Fit', score: 70, benchmark: 70, delta: 0 },
            { name: 'Compliance %', score: 66, benchmark: 80, delta: -14 },
            { name: 'Past Win Rate', score: 55, benchmark: 60, delta: -5 },
            { name: 'Response Time', score: 60, benchmark: 75, delta: -15 },
            { name: 'Sector Match', score: 75, benchmark: 70, delta: 5 },
            { name: 'Gap Count', score: 60, benchmark: 70, delta: -10 }
          ],
          aiReasoning: 'RFP documents successfully processed. Identified 3 core requirements with 1 major gap in Offsite Backup. Compliance stands at 66% with an estimated win probability of 62%.'
        }
      }),
      selectedRequirementId: 'REQ-NEW-01'
    }
  }),

  // Proposal Actions
  updateProposalText: (workspaceId, secId, newText) => set((state) => ({
    workspaces: state.workspaces.map(ws => {
      if (ws.id !== workspaceId) return ws
      return {
        ...ws,
        proposalSections: ws.proposalSections.map(sec => {
          if (sec.id !== secId) return sec
          const wordCount = newText.split(/\s+/).filter(Boolean).length
          return {
            ...sec,
            text: newText,
            wordCount,
            approved: 'Draft' // Reset to draft if manual edits occur
          }
        })
      }
    })
  })),

  approveProposalSection: (workspaceId, secId) => set((state) => ({
    workspaces: state.workspaces.map(ws => {
      if (ws.id !== workspaceId) return ws
      return {
        ...ws,
        proposalSections: ws.proposalSections.map(sec => 
          sec.id === secId ? { ...sec, approved: 'Approved' } : sec
        )
      }
    })
  })),

  rejectProposalSection: (workspaceId, secId) => set((state) => ({
    workspaces: state.workspaces.map(ws => {
      if (ws.id !== workspaceId) return ws
      return {
        ...ws,
        proposalSections: ws.proposalSections.map(sec => 
          sec.id === secId ? { ...sec, approved: 'Pending' } : sec
        )
      }
    })
  })),

  // Capability actions
  addCapability: (capData) => set((state) => {
    const newId = `CAP-${Date.now().toString().slice(-3)}`
    const newCap = {
      id: newId,
      domain: capData.domain || 'General Services',
      certification: capData.certification || 'None',
      year: parseInt(capData.year) || new Date().getFullYear(),
      contractValue: parseInt(capData.contractValue) || 100000,
      duration: capData.duration || '6 Months',
      clientType: capData.clientType || 'Commercial',
      summary: capData.summary || 'Summary description of the capability and past performance.',
      proposalsCited: []
    }
    return {
      capabilities: [newCap, ...state.capabilities]
    }
  }),

  updateCapability: (updatedCap) => set((state) => ({
    capabilities: state.capabilities.map(cap => 
      cap.id === updatedCap.id ? { ...cap, ...updatedCap } : cap
    )
  })),

  deleteCapability: (id) => set((state) => ({
    capabilities: state.capabilities.filter(cap => cap.id !== id)
  }))
}))