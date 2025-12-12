<?php

// String you want to hash
$password = "imposible123";

// Generate secure hash
$hash = password_hash($password, PASSWORD_DEFAULT);

// Output hash
echo "<h2>Generated Hash:</h2>";
echo "<pre>$hash</pre>";

// Example: verify the password (optional)
if (password_verify("imposible123", $hash)) {
    echo "<p style='color:green;'>Password verified successfully!</p>";
} else {
    echo "<p style='color:red;'>Password verification failed.</p>";
}

?>
