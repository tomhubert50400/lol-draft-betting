import React from 'react';
import { Link } from 'react-router-dom';

export default function PasswordResetConfirmation() {
  return (
    <div className="auth-container">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <h2 style={{ color: '#c8aa6e', marginBottom: '20px' }}>Email Envoyé !</h2>
        
        <div className="confirmation-content">
          <p style={{ marginBottom: '20px', fontSize: '1.1em' }}>
            Un email de réinitialisation de mot de passe a été envoyé à votre adresse.
          </p>
          
          <div className="alert warning" style={{ 
            backgroundColor: 'rgba(200, 170, 110, 0.1)', 
            border: '1px solid #c8aa6e',
            padding: '15px',
            borderRadius: '4px',
            marginBottom: '25px',
            textAlign: 'left'
          }}>
            <strong>Important :</strong>
            <ul style={{ marginTop: '10px', paddingLeft: '20px' }}>
              <li>Vérifiez votre boîte de réception.</li>
              <li>Si vous ne le trouvez pas, vérifiez votre dossier <strong>Spams</strong> ou <strong>Courriers indésirables</strong>.</li>
              <li>Le lien peut prendre quelques minutes pour arriver.</li>
            </ul>
          </div>

          <Link to="/login" className="btn-primary" style={{ display: 'inline-block', textDecoration: 'none' }}>
            Retour à la connexion
          </Link>
        </div>
      </div>
    </div>
  );
}
