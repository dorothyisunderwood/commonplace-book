<?php
// ─────────────────────────────────────────────────────────────────────────────
// Minimal SMTP mailer — no Composer, no dependencies.
// Handles TLS SMTP with AUTH LOGIN, sufficient for DreamHost.
// Based on RFC 5321 SMTP with STARTTLS.
// ─────────────────────────────────────────────────────────────────────────────

class Mailer {
  private string $host;
  private int    $port;
  private string $user;
  private string $pass;

  public function __construct(string $host, int $port, string $user, string $pass) {
    $this->host = $host;
    $this->port = $port;
    $this->user = $user;
    $this->pass = $pass;
  }

  // Send a plain-text email. Returns true on success, throws on failure.
  public function send(string $to, string $subject, string $body): bool {
    $sock = fsockopen('tcp://' . $this->host, $this->port, $errno, $errstr, 10);
    if (!$sock) throw new RuntimeException("SMTP connect failed: $errstr ($errno)");

    $read = function() use ($sock): string {
      $buf = '';
      while ($line = fgets($sock, 512)) {
        $buf .= $line;
        if (substr($line, 3, 1) === ' ') break; // last line of response
      }
      return $buf;
    };

    $cmd = function(string $c) use ($sock, $read): string {
      fwrite($sock, $c . "\r\n");
      return $read();
    };

    $read(); // greeting

    // EHLO + STARTTLS
    $cmd("EHLO " . $this->host);
    $cmd("STARTTLS");

    // Upgrade socket to TLS
    if (!stream_socket_enable_crypto($sock, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
      fclose($sock);
      throw new RuntimeException("STARTTLS failed");
    }

    $cmd("EHLO " . $this->host); // re-EHLO after TLS
    $cmd("AUTH LOGIN");
    $cmd(base64_encode($this->user));
    $r = $cmd(base64_encode($this->pass));
    if (strpos($r, '235') === false) {
      fclose($sock);
      throw new RuntimeException("SMTP AUTH failed: $r");
    }

    $cmd("MAIL FROM:<{$this->user}>");
    $cmd("RCPT TO:<{$to}>");
    $cmd("DATA");

    $headers  = "From: Commonplace Book <{$this->user}>\r\n";
    $headers .= "To: {$to}\r\n";
    $headers .= "Subject: {$subject}\r\n";
    $headers .= "MIME-Version: 1.0\r\n";
    $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
    $headers .= "X-Mailer: CommonplaceMailer/1.0\r\n";

    fwrite($sock, $headers . "\r\n" . $body . "\r\n.\r\n");
    $r = $read();
    $cmd("QUIT");
    fclose($sock);

    if (strpos($r, '250') === false) {
      throw new RuntimeException("SMTP DATA failed: $r");
    }
    return true;
  }
}
