from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime


class TimelineEntry(BaseModel):
    id: str
    title: str
    item_type: str
    confidence: float
    verification_status: str
    created_at: Optional[str] = None
    source_reference: str
    labels: List[str] = []


class DecisionEntry(BaseModel):
    decision: Dict[str, Any]
    evidence: List[Dict[str, Any]]
    labels: List[str]


class TaskSummary(BaseModel):
    pending: List[Dict[str, Any]]
    completed: List[Dict[str, Any]]
    ownership_gaps: List[Dict[str, Any]]


class DependencySummary(BaseModel):
    dependency_graph: Dict[str, Any]
    total_dependencies: int


class RiskBlockerSummary(BaseModel):
    risks: List[Dict[str, Any]]
    blockers: List[Dict[str, Any]]
    risk_count: int
    blocker_count: int


class UnresolvedQuestion(BaseModel):
    id: str
    title: str
    content: str
    confidence: float
    labels: List[str]
    evidence: List[Dict[str, Any]]


class MilestoneEntry(BaseModel):
    id: str
    title: str
    content: str
    confidence: float
    has_date: bool
    labels: List[str]
    evidence: List[Dict[str, Any]]


class ConflictAnalysis(BaseModel):
    item_a: Dict[str, Any]
    item_b: Dict[str, Any]
    similarity: float
    labels: List[str] = ["Conflicting"]


class LabelMapping(BaseModel):
    item_id: str
    item_type: str
    labels: List[str]


class ProjectReconstructionResponse(BaseModel):
    project_id: str
    project_name: str
    generated_at: str
    timeline: List[TimelineEntry]
    decision_history: List[DecisionEntry]
    tasks: TaskSummary
    dependencies: DependencySummary
    risks_blockers: RiskBlockerSummary
    unresolved_questions: List[UnresolvedQuestion]
    milestones: List[MilestoneEntry]
    conflicts: List[ConflictAnalysis]
    label_mapping: List[LabelMapping]