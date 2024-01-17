// XXX even though ethers is not used in the code below, it's very likely
// it will be used by any DApp, so we are already including it here
const { ethers } = require("ethers");

const rollup_server = process.env.ROLLUP_HTTP_SERVER_URL;
console.log("HTTP rollup_server url is " + rollup_server);

async function handle_advance(data) {
  console.log("Received calculation request data " + JSON.stringify(data));

  console.log(data["payload"]);
  console.log(typeof data["payload"]);

  // Extract numbers and operators from payload
  const { operand1, operand2, operator } = JSON.parse(
    JSON.parse(ethers.toUtf8String(data["payload"]))
  );

  try {
    const result = calculate(operand1, operand2, operator);

    // Send the result back (adjust endpoint as needed)
    const calculate_req = await fetch(rollup_server + "/notice", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ result }),
    });

    console.log("Sent calculation result:", result);

    return "accept";
  } catch (error) {
    console.error("Error during calculation:", error);
    return "error";
  }
}

async function handle_inspect(data) {
  console.log("Received inspect request data " + JSON.stringify(data));
  return "accept";
}

function calculate(operand1, operand2, operator) {
  switch (operator) {
    case "+":
      return Number(operand1) + Number(operand2);
    case "-":
      return Number(operand1) - Number(operand2);
    case "*":
      return Number(operand1) * Number(operand2);
    case "/":
      if (Number(operand2) === 0) {
        throw new Error("Division by zero");
      }
      return Number(operand1) / Number(operand2);
    default:
      throw new Error("Invalid operator");
  }
}

var handlers = {
  advance_state: handle_advance,
  inspect_state: handle_inspect,
};

var finish = { status: "accept" };

(async () => {
  while (true) {
    const finish_req = await fetch(rollup_server + "/finish", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: "accept" }),
    });

    console.log("Received finish status " + finish_req.status);

    if (finish_req.status == 202) {
      console.log("No pending rollup request, trying again");
    } else {
      const rollup_req = await finish_req.json();
      var handler = handlers[rollup_req["request_type"]];
      finish["status"] = await handler(rollup_req["data"]);
    }
  }
})();
