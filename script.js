// ============================================================
// Assign Enquiry - Role Restricted Owner Widget
// Filters the Lead Owner dropdown to a single Role (e.g. "Direct Sales Executive")
// and submits the Blueprint transition on Save.
// ============================================================

// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
// CHANGE THIS to match the exact Role name in your Zoho CRM org
// (Setup -> Users and Control -> Security Control -> Roles)
const ALLOWED_ROLE_NAME = "Direct Sales Executive";

// CHANGE THIS if the field's API name for the transition data is different
// (usually "Owner" for Leads' Lead Owner field - confirm in Setup -> Developer Hub -> APIs)
const OWNER_FIELD_API_NAME = "Owner";
// <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

let recordId = null;
let transitionId = null;
let moduleApiName = "Leads";

const statusEl = document.getElementById("statusMsg");
const selectEl = document.getElementById("ownerSelect");
const submitBtn = document.getElementById("submitBtn");
const cancelBtn = document.getElementById("cancelBtn");

function setStatus(msg, isError) {
  statusEl.textContent = msg;
  statusEl.className = isError ? "status error" : "status";
}

// ---- 1. Fires when the widget loads inside the Blueprint transition popup ----
ZOHO.embeddedApp.on("PageLoad", function (data) {
  // IMPORTANT: console.log this once in the browser dev tools (F12) the first
  // time you test the widget live in CRM, to confirm the exact keys Zoho sends
  // for record id / transition id / module in your org's Blueprint context.
  console.log("PageLoad data:", data);

  recordId = data.EntityId || (data.Entity && data.Entity[0]) || data.recordId;
  transitionId = data.TransitionId || data.transition_id;
  moduleApiName = data.Entity && data.Entity.moduleName ? data.Entity.moduleName : "Leads";

  loadUsersByRole();
});

// ---- 2. Fetch all users, filter by role, populate dropdown ----
function loadUsersByRole() {
  ZOHO.CRM.API.getAllUsers({ Type: "ActiveConfirmedUsers" })
    .then(function (res) {
      const allUsers = (res && res.users) || [];

      const filtered = allUsers.filter(function (u) {
        return u.role && u.role.name === ALLOWED_ROLE_NAME;
      });

      if (filtered.length === 0) {
        setStatus('No active users found with role "' + ALLOWED_ROLE_NAME + '".', true);
        return;
      }

      filtered.forEach(function (u) {
        const opt = document.createElement("option");
        opt.value = u.id;
        opt.textContent = u.full_name || (u.first_name + " " + u.last_name);
        selectEl.appendChild(opt);
      });

      selectEl.disabled = false;
      submitBtn.disabled = false;
      setStatus("Select the Direct Sales Executive to assign.", false);
    })
    .catch(function (err) {
      console.error("getAllUsers failed:", err);
      setStatus("Could not load users. Check console for details.", true);
    });
}

// ---- 3. Submit the Blueprint transition with the chosen owner ----
submitBtn.addEventListener("click", function () {
  const selectedUserId = selectEl.value;

  if (!selectedUserId) {
    setStatus("Please select a user before saving.", true);
    return;
  }
  if (!recordId || !transitionId) {
    setStatus("Missing record or transition context. See console.", true);
    console.error("recordId:", recordId, "transitionId:", transitionId);
    return;
  }

  submitBtn.disabled = true;
  setStatus("Saving...", false);

  const data = {};
  data[OWNER_FIELD_API_NAME] = selectedUserId;

  ZOHO.CRM.API.updateBluePrint({
    Entity: moduleApiName,
    RecordID: recordId,
    APIData: {
      blueprint: [
        {
          transition_id: transitionId,
          data: data
        }
      ]
    }
  })
    .then(function (resp) {
      console.log("updateBluePrint response:", resp);
      setStatus("Saved. Closing...", false);
      // Closes the widget popup back to the record detail page
      if (ZOHO.CRM.UI && ZOHO.CRM.UI.Popup) {
        ZOHO.CRM.UI.Popup.closeReload();
      }
    })
    .catch(function (err) {
      console.error("updateBluePrint failed:", err);
      submitBtn.disabled = false;
      setStatus("Save failed. Check console for details.", true);
    });
});

cancelBtn.addEventListener("click", function () {
  if (ZOHO.CRM.UI && ZOHO.CRM.UI.Popup) {
    ZOHO.CRM.UI.Popup.close();
  }
});

// ---- 4. Initialize the SDK (must be called last) ----
ZOHO.embeddedApp.init();
