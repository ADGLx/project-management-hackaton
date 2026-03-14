import { useEffect, useState } from "react";
import AddTransactionFab from "../components/AddTransactionFab";
import MobileNav from "../components/MobileNav";
import { createMyHousehold, getMyHousehold, inviteToHousehold, leaveMyHousehold } from "../lib/api";
import { useAuth } from "../state/AuthContext";
import type { Household } from "../types/auth";

export default function HouseholdPage() {
  const { user } = useAuth();
  const [household, setHousehold] = useState<Household | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingError, setLoadingError] = useState("");

  const [newHouseholdName, setNewHouseholdName] = useState("");
  const [createError, setCreateError] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");
  const [isInviting, setIsInviting] = useState(false);

  const [leaveError, setLeaveError] = useState("");
  const [leaveSuccess, setLeaveSuccess] = useState("");
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadHousehold() {
      setIsLoading(true);
      setLoadingError("");

      const result = await getMyHousehold();

      if (!isMounted) {
        return;
      }

      if (!result.ok) {
        setLoadingError(result.message);
      } else {
        setHousehold(result.household);
      }

      setIsLoading(false);
    }

    void loadHousehold();

    return () => {
      isMounted = false;
    };
  }, []);

  async function onCreateHousehold() {
    setCreateError("");
    setInviteSuccess("");
    setLeaveError("");
    setLeaveSuccess("");

    const name = newHouseholdName.trim();

    if (!name) {
      setCreateError("Please enter a household name.");
      return;
    }

    setIsCreating(true);
    const result = await createMyHousehold(name);
    setIsCreating(false);

    if (!result.ok) {
      setCreateError(result.message);
      return;
    }

    setHousehold(result.household);
    setNewHouseholdName("");
  }

  async function onInviteMember() {
    if (!household) {
      return;
    }

    setInviteError("");
    setInviteSuccess("");
    setLeaveError("");
    setLeaveSuccess("");

    const email = inviteEmail.trim().toLowerCase();

    if (!email) {
      setInviteError("Please enter a registered email.");
      return;
    }

    setIsInviting(true);
    const result = await inviteToHousehold(household.id, email);
    setIsInviting(false);

    if (!result.ok) {
      setInviteError(result.message);
      return;
    }

    setHousehold(result.household);
    setInviteEmail("");
    setInviteSuccess("Member added to household.");
  }

  async function onLeaveHousehold() {
    setLeaveError("");
    setLeaveSuccess("");
    setInviteSuccess("");

    setIsLeaving(true);
    const result = await leaveMyHousehold();
    setIsLeaving(false);

    if (!result.ok) {
      setLeaveError(result.message);
      return;
    }

    setHousehold(null);
    setInviteEmail("");
    setLeaveSuccess("You left the household.");
  }

  return (
    <main className="home-shell">
      <section className="page-title-row">
        <h1>Household</h1>
      </section>

      <section className="dashboard-card">
        {isLoading ? (
          <p>Loading household...</p>
        ) : household ? (() => {
          const isCreator = household.createdByUserId === user?.id;

          return (
            <>
            <h2>{household.name}</h2>
            {isCreator ? <p>Invite by registered email. Users can only belong to one household for now.</p> : <p>Only the creator can invite users to this household.</p>}

            {isCreator ? (
              <div className="household-invite-form">
                <label htmlFor="invite-email">Invite member by email</label>
                <div className="household-inline-form">
                  <input
                    id="invite-email"
                    type="email"
                    value={inviteEmail}
                    onChange={(event) => setInviteEmail(event.target.value)}
                    placeholder="name@example.com"
                    disabled={isInviting}
                  />
                  <button type="button" onClick={onInviteMember} disabled={isInviting}>
                    {isInviting ? "Inviting..." : "Invite"}
                  </button>
                </div>
                {inviteError ? <p className="feedback error">{inviteError}</p> : null}
                {inviteSuccess ? <p className="feedback success">{inviteSuccess}</p> : null}
              </div>
            ) : null}

            <div className="household-members">
              <h3>Members</h3>
              <ul className="household-member-list">
                {household.members.map((member) => (
                  <li key={member.userId} className="household-member-row">
                    <span>{member.name}</span>
                  </li>
                ))}
              </ul>
            </div>
            <button className="secondary-button" type="button" onClick={onLeaveHousehold} disabled={isLeaving}>
              {isLeaving ? "Leaving..." : "Leave household"}
            </button>
          </>
          );
        })() : (
          <>
            <h2>Create your household</h2>
            <p>Start by creating a household, then invite registered users by email.</p>

            <div className="household-inline-form">
              <input
                type="text"
                value={newHouseholdName}
                onChange={(event) => setNewHouseholdName(event.target.value)}
                placeholder="Ex: The Rivera Household"
                disabled={isCreating}
                maxLength={80}
              />
              <button type="button" onClick={onCreateHousehold} disabled={isCreating}>
                {isCreating ? "Creating..." : "Create"}
              </button>
            </div>
            {createError ? <p className="feedback error">{createError}</p> : null}
          </>
        )}

        {leaveError ? <p className="feedback error">{leaveError}</p> : null}
        {leaveSuccess ? <p className="feedback success">{leaveSuccess}</p> : null}
        {loadingError ? <p className="feedback error">{loadingError}</p> : null}
      </section>

      <AddTransactionFab />
      <MobileNav />
    </main>
  );
}
