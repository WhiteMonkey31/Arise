from datetime import datetime
from enum import Enum
from typing import List, Optional
from uuid import UUID, uuid4

import sqlalchemy as sa
from sqlmodel import Column, Field, Relationship, SQLModel, String


class WorkspaceStatus(str, Enum):
    DRAFT = "Draft"
    IN_REVIEW = "InReview"
    SUBMITTED = "Submitted"


class DocumentStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    DONE = "done"
    FAILED = "failed"


class ComplianceStatus(str, Enum):
    PASS = "PASS"
    PARTIAL = "PARTIAL"
    GAP = "GAP"


class ProposalStatus(str, Enum):
    PENDING = "pending"
    IN_REVIEW = "in_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    NEEDS_EDIT = "needs_edit"


class JobStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    DONE = "done"
    FAILED = "failed"


class UserRole(str, Enum):
    ADMIN = "admin"
    BID_MANAGER = "bid_manager"
    REVIEWER = "reviewer"


class BidOutcome(str, Enum):
    WIN = "win"
    LOSS = "loss"


class AIProviderName(str, Enum):
    CLAUDE = "claude"
    OPENAI = "openai"
    GEMINI = "gemini"
    GROK = "grok"
    CUSTOM = "custom"


class ReviewAction(str, Enum):
    APPROVE = "approve"
    REJECT = "reject"
    REQUEST_EDIT = "request_edit"
    COMMENT = "comment"
    ASSIGN = "assign"


class Organization(SQLModel, table=True):
    __tablename__ = "organizations"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    name: str = Field(max_length=255, index=True)
    slug: str = Field(max_length=100, unique=True, index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    workspaces: List["Workspace"] = Relationship(back_populates="organization")
    users: List["User"] = Relationship(back_populates="organization")
    capabilities: List["Capability"] = Relationship(back_populates="organization")
    bids: List["Bid"] = Relationship(back_populates="organization")
    ai_providers: List["AIProviderConfig"] = Relationship(back_populates="organization")


class User(SQLModel, table=True):
    __tablename__ = "users"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    email: str = Field(max_length=255, unique=True, index=True)
    hashed_password: Optional[str] = Field(default=None, max_length=255)
    org_id: UUID = Field(foreign_key="organizations.id", index=True)
    role: UserRole = Field(default=UserRole.REVIEWER, sa_column=Column(String(20)))
    is_active: bool = Field(default=True)
    google_id: Optional[str] = Field(default=None, max_length=255, index=True)
    google_picture: Optional[str] = Field(default=None, max_length=512)
    full_name: Optional[str] = Field(default=None, max_length=255)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    organization: Optional[Organization] = Relationship(back_populates="users")


class Workspace(SQLModel, table=True):
    __tablename__ = "workspaces"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    name: str = Field(max_length=255, index=True)
    org_id: UUID = Field(foreign_key="organizations.id", index=True)
    sector: Optional[str] = Field(default=None, max_length=100)
    deadline: Optional[datetime] = Field(default=None)
    budget: Optional[float] = Field(default=None)
    status: WorkspaceStatus = Field(default=WorkspaceStatus.DRAFT, sa_column=Column(String(20)))
    win_probability: Optional[float] = Field(default=None)
    assigned_to: Optional[UUID] = Field(default=None, foreign_key="users.id")  # assigned bid manager
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    deleted_at: Optional[datetime] = Field(default=None)

    organization: Optional[Organization] = Relationship(back_populates="workspaces")
    rfp_documents: List["RfpDocument"] = Relationship(back_populates="workspace")
    requirements: List["Requirement"] = Relationship(back_populates="workspace")
    compliance_items: List["ComplianceItem"] = Relationship(back_populates="workspace")
    proposals: List["Proposal"] = Relationship(back_populates="workspace")
    jobs: List["Job"] = Relationship(back_populates="workspace")
    proposal_documents: List["ProposalDocument"] = Relationship(back_populates="workspace")


class RfpDocument(SQLModel, table=True):
    __tablename__ = "rfp_documents"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    workspace_id: UUID = Field(foreign_key="workspaces.id", index=True)
    filename: str = Field(max_length=255)
    original_filename: str = Field(max_length=255)
    file_size: Optional[int] = Field(default=None)
    mime_type: Optional[str] = Field(default=None, max_length=100)
    s3_key: str = Field(max_length=512)
    extracted_text: Optional[str] = Field(default=None, sa_column=Column(sa.Text))
    status: DocumentStatus = Field(default=DocumentStatus.PENDING, sa_column=Column(String(20)))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    workspace: Optional[Workspace] = Relationship(back_populates="rfp_documents")
    requirements: List["Requirement"] = Relationship(back_populates="rfp_document")


class Requirement(SQLModel, table=True):
    __tablename__ = "requirements"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    rfp_document_id: UUID = Field(foreign_key="rfp_documents.id", index=True)
    workspace_id: UUID = Field(foreign_key="workspaces.id", index=True)
    text: str = Field(sa_column=Column(sa.Text))
    category: Optional[str] = Field(default=None, max_length=100)
    section_number: Optional[str] = Field(default=None, max_length=50)  # e.g. "3.1", "Q4"
    is_mandatory: bool = Field(default=True)
    evaluation_criteria: Optional[str] = Field(default=None, sa_column=Column(sa.Text))
    deadline_ref: Optional[str] = Field(default=None, max_length=255)
    budget_ref: Optional[str] = Field(default=None, max_length=255)
    iso_standard: Optional[str] = Field(default=None, max_length=100)
    compliance_ref: Optional[str] = Field(default=None, max_length=255)
    sort_order: int = Field(default=0)  # preserves original document order
    created_at: datetime = Field(default_factory=datetime.utcnow)

    rfp_document: Optional[RfpDocument] = Relationship(back_populates="requirements")
    workspace: Optional[Workspace] = Relationship(back_populates="requirements")
    compliance_items: List["ComplianceItem"] = Relationship(back_populates="requirement")
    proposals: List["Proposal"] = Relationship(back_populates="requirement")


class Capability(SQLModel, table=True):
    __tablename__ = "capabilities"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    org_id: UUID = Field(foreign_key="organizations.id", index=True)
    title: str = Field(max_length=255)
    description: str = Field(sa_column=Column(sa.Text))
    domain: Optional[str] = Field(default=None, max_length=100)
    certification: Optional[str] = Field(default=None, max_length=255)
    year: Optional[int] = Field(default=None)
    client_type: Optional[str] = Field(default=None, max_length=100)
    embedding_id: Optional[str] = Field(default=None, max_length=255)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    organization: Optional[Organization] = Relationship(back_populates="capabilities")
    compliance_items: List["ComplianceItem"] = Relationship(back_populates="capability")


class Bid(SQLModel, table=True):
    __tablename__ = "bids"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    org_id: UUID = Field(foreign_key="organizations.id", index=True)
    workspace_id: Optional[UUID] = Field(default=None, foreign_key="workspaces.id")
    sector: Optional[str] = Field(default=None, max_length=100)
    budget: Optional[float] = Field(default=None)
    submitted_at: Optional[datetime] = Field(default=None)
    outcome: Optional[BidOutcome] = Field(default=None, sa_column=Column(String(10)))
    bid_manager: Optional[str] = Field(default=None, max_length=255)
    compliance_pct: Optional[float] = Field(default=None)
    score: Optional[float] = Field(default=None)
    response_days: Optional[int] = Field(default=None)

    organization: Optional[Organization] = Relationship(back_populates="bids")


class ComplianceItem(SQLModel, table=True):
    __tablename__ = "compliance_items"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    workspace_id: UUID = Field(foreign_key="workspaces.id", index=True)
    requirement_id: UUID = Field(foreign_key="requirements.id", index=True)
    capability_id: Optional[UUID] = Field(default=None, foreign_key="capabilities.id")
    match_score: Optional[float] = Field(default=None)
    status: ComplianceStatus = Field(default=ComplianceStatus.GAP, sa_column=Column(String(10)))
    notes: Optional[str] = Field(default=None, sa_column=Column(sa.Text))
    iso_verified: bool = Field(default=False)
    iso_standard: Optional[str] = Field(default=None, max_length=100)
    iso_clause: Optional[str] = Field(default=None, max_length=100)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    workspace: Optional[Workspace] = Relationship(back_populates="compliance_items")
    requirement: Optional[Requirement] = Relationship(back_populates="compliance_items")
    capability: Optional[Capability] = Relationship(back_populates="compliance_items")


class Proposal(SQLModel, table=True):
    __tablename__ = "proposals"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    workspace_id: UUID = Field(foreign_key="workspaces.id", index=True)
    requirement_id: UUID = Field(foreign_key="requirements.id", index=True)
    section_title: str = Field(max_length=255)
    section_number: Optional[str] = Field(default=None, max_length=50)  # mirrors requirement section number
    ai_draft: Optional[str] = Field(default=None, sa_column=Column(sa.Text))
    current_content: Optional[str] = Field(default=None, sa_column=Column(sa.Text))
    word_count: Optional[int] = Field(default=None)
    target_word_count: Optional[int] = Field(default=None)
    status: ProposalStatus = Field(default=ProposalStatus.PENDING, sa_column=Column(String(20)))
    quality_score: Optional[float] = Field(default=None)
    quality_badge: Optional[str] = Field(default=None, max_length=20)
    ai_provider_used: Optional[str] = Field(default=None, max_length=50)
    assigned_to: Optional[UUID] = Field(default=None, foreign_key="users.id")  # reviewer assignment
    reviewed_by: Optional[UUID] = Field(default=None, foreign_key="users.id")
    reviewed_at: Optional[datetime] = Field(default=None)
    sort_order: int = Field(default=0)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    workspace: Optional[Workspace] = Relationship(back_populates="proposals")
    requirement: Optional[Requirement] = Relationship(back_populates="proposals")
    versions: List["ProposalVersion"] = Relationship(back_populates="proposal")
    comments: List["ProposalComment"] = Relationship(back_populates="proposal")
    activity_logs: List["ProposalActivityLog"] = Relationship(back_populates="proposal")


class ProposalVersion(SQLModel, table=True):
    __tablename__ = "proposal_versions"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    proposal_id: UUID = Field(foreign_key="proposals.id", index=True)
    content: str = Field(sa_column=Column(sa.Text))
    version_num: int = Field(default=1)
    edited_by: Optional[UUID] = Field(default=None, foreign_key="users.id")
    change_summary: Optional[str] = Field(default=None, max_length=500)  # brief note on what changed
    created_at: datetime = Field(default_factory=datetime.utcnow)

    proposal: Optional[Proposal] = Relationship(back_populates="versions")


class ProposalComment(SQLModel, table=True):
    """Inline comments on a proposal section from reviewers/bid managers."""
    __tablename__ = "proposal_comments"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    proposal_id: UUID = Field(foreign_key="proposals.id", index=True)
    user_id: UUID = Field(foreign_key="users.id", index=True)
    text: str = Field(sa_column=Column(sa.Text))
    resolved: bool = Field(default=False)
    parent_id: Optional[UUID] = Field(default=None, foreign_key="proposal_comments.id")  # thread replies
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    proposal: Optional[Proposal] = Relationship(back_populates="comments")


class ProposalActivityLog(SQLModel, table=True):
    """Audit trail — every action taken on a proposal section."""
    __tablename__ = "proposal_activity_logs"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    proposal_id: UUID = Field(foreign_key="proposals.id", index=True)
    user_id: UUID = Field(foreign_key="users.id")
    action: ReviewAction = Field(sa_column=Column(String(30)))
    detail: Optional[str] = Field(default=None, sa_column=Column(sa.Text))  # e.g. rejection reason
    created_at: datetime = Field(default_factory=datetime.utcnow)

    proposal: Optional[Proposal] = Relationship(back_populates="activity_logs")


class ProposalDocument(SQLModel, table=True):
    """
    A fully assembled proposal document — the output of auto-drafting
    all sections mapped to the RFP structure. Think of this as the
    final document a bid manager reviews before submitting.
    """
    __tablename__ = "proposal_documents"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    workspace_id: UUID = Field(foreign_key="workspaces.id", index=True)
    title: str = Field(max_length=255)
    # Serialized section structure: JSON array of {section_number, title, requirement_id, proposal_id}
    structure: str = Field(sa_column=Column(sa.Text))
    cover_page: Optional[str] = Field(default=None, sa_column=Column(sa.Text))
    executive_summary: Optional[str] = Field(default=None, sa_column=Column(sa.Text))
    total_word_count: Optional[int] = Field(default=None)
    approved_sections: int = Field(default=0)
    total_sections: int = Field(default=0)
    completion_pct: float = Field(default=0.0)
    ai_provider_used: Optional[str] = Field(default=None, max_length=50)
    status: str = Field(default="draft", max_length=30, sa_column=Column(String(30)))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    workspace: Optional[Workspace] = Relationship(back_populates="proposal_documents")


class Job(SQLModel, table=True):
    __tablename__ = "jobs"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    workspace_id: Optional[UUID] = Field(default=None, foreign_key="workspaces.id", index=True)
    task_id: Optional[str] = Field(default=None, max_length=255)
    job_type: str = Field(max_length=50)
    status: JobStatus = Field(default=JobStatus.PENDING, sa_column=Column(String(20)))
    progress_pct: int = Field(default=0)
    error_msg: Optional[str] = Field(default=None, sa_column=Column(sa.Text))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    workspace: Optional[Workspace] = Relationship(back_populates="jobs")


class AIProviderConfig(SQLModel, table=True):
    __tablename__ = "ai_provider_configs"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    org_id: UUID = Field(foreign_key="organizations.id", index=True)
    name: str = Field(max_length=100)
    provider_type: str = Field(max_length=50, sa_column=Column(String(50)))
    api_key_encrypted: str = Field(sa_column=Column(sa.Text))
    base_url: Optional[str] = Field(default=None, max_length=512)
    model_name: str = Field(max_length=100)
    is_active: bool = Field(default=True)
    is_default: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    organization: Optional[Organization] = Relationship(back_populates="ai_providers")



class Organization(SQLModel, table=True):
    __tablename__ = "organizations"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    name: str = Field(max_length=255, index=True)
    slug: str = Field(max_length=100, unique=True, index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    workspaces: List["Workspace"] = Relationship(back_populates="organization")
    users: List["User"] = Relationship(back_populates="organization")
    capabilities: List["Capability"] = Relationship(back_populates="organization")
    bids: List["Bid"] = Relationship(back_populates="organization")
    ai_providers: List["AIProviderConfig"] = Relationship(back_populates="organization")


class User(SQLModel, table=True):
    __tablename__ = "users"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    email: str = Field(max_length=255, unique=True, index=True)
    hashed_password: Optional[str] = Field(default=None, max_length=255)  # nullable for OAuth users
    org_id: UUID = Field(foreign_key="organizations.id", index=True)
    role: UserRole = Field(default=UserRole.REVIEWER, sa_column=Column(String(20)))
    is_active: bool = Field(default=True)
    # Google OAuth fields
    google_id: Optional[str] = Field(default=None, max_length=255, index=True)
    google_picture: Optional[str] = Field(default=None, max_length=512)
    full_name: Optional[str] = Field(default=None, max_length=255)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    organization: Optional[Organization] = Relationship(back_populates="users")


class Workspace(SQLModel, table=True):
    __tablename__ = "workspaces"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    name: str = Field(max_length=255, index=True)
    org_id: UUID = Field(foreign_key="organizations.id", index=True)
    sector: Optional[str] = Field(default=None, max_length=100)
    deadline: Optional[datetime] = Field(default=None)
    budget: Optional[float] = Field(default=None)
    status: WorkspaceStatus = Field(default=WorkspaceStatus.DRAFT, sa_column=Column(String(20)))
    win_probability: Optional[float] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    deleted_at: Optional[datetime] = Field(default=None)

    organization: Optional[Organization] = Relationship(back_populates="workspaces")
    rfp_documents: List["RfpDocument"] = Relationship(back_populates="workspace")
    requirements: List["Requirement"] = Relationship(back_populates="workspace")
    compliance_items: List["ComplianceItem"] = Relationship(back_populates="workspace")
    proposals: List["Proposal"] = Relationship(back_populates="workspace")
    jobs: List["Job"] = Relationship(back_populates="workspace")


class RfpDocument(SQLModel, table=True):
    __tablename__ = "rfp_documents"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    workspace_id: UUID = Field(foreign_key="workspaces.id", index=True)
    filename: str = Field(max_length=255)
    original_filename: str = Field(max_length=255)
    file_size: Optional[int] = Field(default=None)  # bytes
    mime_type: Optional[str] = Field(default=None, max_length=100)
    s3_key: str = Field(max_length=512)
    extracted_text: Optional[str] = Field(default=None, sa_column=Column(sa.Text))
    status: DocumentStatus = Field(default=DocumentStatus.PENDING, sa_column=Column(String(20)))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    workspace: Optional[Workspace] = Relationship(back_populates="rfp_documents")
    requirements: List["Requirement"] = Relationship(back_populates="rfp_document")


class Requirement(SQLModel, table=True):
    __tablename__ = "requirements"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    rfp_document_id: UUID = Field(foreign_key="rfp_documents.id", index=True)
    workspace_id: UUID = Field(foreign_key="workspaces.id", index=True)
    text: str = Field(sa_column=Column(sa.Text))
    category: Optional[str] = Field(default=None, max_length=100)
    is_mandatory: bool = Field(default=True)
    evaluation_criteria: Optional[str] = Field(default=None, sa_column=Column(sa.Text))
    deadline_ref: Optional[str] = Field(default=None, max_length=255)
    budget_ref: Optional[str] = Field(default=None, max_length=255)
    # ISO/compliance standard references
    iso_standard: Optional[str] = Field(default=None, max_length=100)  # e.g. "ISO 9001", "ISO 27001"
    compliance_ref: Optional[str] = Field(default=None, max_length=255)  # external standard ID
    created_at: datetime = Field(default_factory=datetime.utcnow)

    rfp_document: Optional[RfpDocument] = Relationship(back_populates="requirements")
    workspace: Optional[Workspace] = Relationship(back_populates="requirements")
    compliance_items: List["ComplianceItem"] = Relationship(back_populates="requirement")
    proposals: List["Proposal"] = Relationship(back_populates="requirement")


class Capability(SQLModel, table=True):
    __tablename__ = "capabilities"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    org_id: UUID = Field(foreign_key="organizations.id", index=True)
    title: str = Field(max_length=255)
    description: str = Field(sa_column=Column(sa.Text))
    domain: Optional[str] = Field(default=None, max_length=100)
    certification: Optional[str] = Field(default=None, max_length=255)
    year: Optional[int] = Field(default=None)
    client_type: Optional[str] = Field(default=None, max_length=100)
    embedding_id: Optional[str] = Field(default=None, max_length=255)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    organization: Optional[Organization] = Relationship(back_populates="capabilities")
    compliance_items: List["ComplianceItem"] = Relationship(back_populates="capability")


class Bid(SQLModel, table=True):
    __tablename__ = "bids"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    org_id: UUID = Field(foreign_key="organizations.id", index=True)
    workspace_id: Optional[UUID] = Field(default=None, foreign_key="workspaces.id")
    sector: Optional[str] = Field(default=None, max_length=100)
    budget: Optional[float] = Field(default=None)
    submitted_at: Optional[datetime] = Field(default=None)
    outcome: Optional[BidOutcome] = Field(default=None, sa_column=Column(String(10)))
    bid_manager: Optional[str] = Field(default=None, max_length=255)
    compliance_pct: Optional[float] = Field(default=None)
    score: Optional[float] = Field(default=None)
    response_days: Optional[int] = Field(default=None)

    organization: Optional[Organization] = Relationship(back_populates="bids")


class ComplianceItem(SQLModel, table=True):
    __tablename__ = "compliance_items"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    workspace_id: UUID = Field(foreign_key="workspaces.id", index=True)
    requirement_id: UUID = Field(foreign_key="requirements.id", index=True)
    capability_id: Optional[UUID] = Field(default=None, foreign_key="capabilities.id")
    match_score: Optional[float] = Field(default=None)
    status: ComplianceStatus = Field(default=ComplianceStatus.GAP, sa_column=Column(String(10)))
    notes: Optional[str] = Field(default=None, sa_column=Column(sa.Text))
    # ISO verification fields
    iso_verified: bool = Field(default=False)
    iso_standard: Optional[str] = Field(default=None, max_length=100)
    iso_clause: Optional[str] = Field(default=None, max_length=100)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    workspace: Optional[Workspace] = Relationship(back_populates="compliance_items")
    requirement: Optional[Requirement] = Relationship(back_populates="compliance_items")
    capability: Optional[Capability] = Relationship(back_populates="compliance_items")


class Proposal(SQLModel, table=True):
    __tablename__ = "proposals"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    workspace_id: UUID = Field(foreign_key="workspaces.id", index=True)
    requirement_id: UUID = Field(foreign_key="requirements.id", index=True)
    section_title: str = Field(max_length=255)
    ai_draft: Optional[str] = Field(default=None, sa_column=Column(sa.Text))
    current_content: Optional[str] = Field(default=None, sa_column=Column(sa.Text))
    word_count: Optional[int] = Field(default=None)
    status: ProposalStatus = Field(default=ProposalStatus.PENDING, sa_column=Column(String(20)))
    quality_score: Optional[float] = Field(default=None)
    quality_badge: Optional[str] = Field(default=None, max_length=20)
    ai_provider_used: Optional[str] = Field(default=None, max_length=50)  # which AI drafted this
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    workspace: Optional[Workspace] = Relationship(back_populates="proposals")
    requirement: Optional[Requirement] = Relationship(back_populates="proposals")
    versions: List["ProposalVersion"] = Relationship(back_populates="proposal")


class ProposalVersion(SQLModel, table=True):
    __tablename__ = "proposal_versions"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    proposal_id: UUID = Field(foreign_key="proposals.id", index=True)
    content: str = Field(sa_column=Column(sa.Text))
    version_num: int = Field(default=1)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    proposal: Optional[Proposal] = Relationship(back_populates="versions")


class Job(SQLModel, table=True):
    __tablename__ = "jobs"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    workspace_id: Optional[UUID] = Field(default=None, foreign_key="workspaces.id", index=True)
    task_id: Optional[str] = Field(default=None, max_length=255)
    job_type: str = Field(max_length=50)
    status: JobStatus = Field(default=JobStatus.PENDING, sa_column=Column(String(20)))
    progress_pct: int = Field(default=0)
    error_msg: Optional[str] = Field(default=None, sa_column=Column(sa.Text))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    workspace: Optional[Workspace] = Relationship(back_populates="jobs")


# Stores per-org AI provider configs (including custom ones)
class AIProviderConfig(SQLModel, table=True):
    __tablename__ = "ai_provider_configs"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    org_id: UUID = Field(foreign_key="organizations.id", index=True)
    name: str = Field(max_length=100)  # display name, e.g. "My Azure OpenAI"
    provider_type: str = Field(max_length=50, sa_column=Column(String(50)))  # claude/openai/gemini/grok/custom
    api_key_encrypted: str = Field(sa_column=Column(sa.Text))  # encrypted at rest
    base_url: Optional[str] = Field(default=None, max_length=512)  # for custom/Azure endpoints
    model_name: str = Field(max_length=100)  # e.g. "gpt-4o", "gemini-1.5-pro"
    is_active: bool = Field(default=True)
    is_default: bool = Field(default=False)  # org's default provider
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    organization: Optional[Organization] = Relationship(back_populates="ai_providers")
