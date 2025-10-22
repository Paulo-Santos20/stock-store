import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import {
  updateProfile,
  reauthenticateWithCredential,
  EmailAuthProvider,
  updatePassword,
} from "firebase/auth";
import { storage, db } from "../firebase/config";
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage";
import {
  collection,
  query,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  serverTimestamp,
  where,
  getDocs,
  limit,
} from "firebase/firestore";
import { FiUser, FiCamera } from "react-icons/fi";
import "./FormPages.css";

const logActivity = async (userId, action) => {
  try {
    await addDoc(collection(db, "activityLogs"), {
      userId: userId,
      action: action,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    // Erro de registo de atividade mantido para depuração de produção
    console.error("Erro ao registrar atividade: ", error);
  }
};

const PerfilPage = () => {
  const { currentUser } = useAuth();

  const [userData, setUserData] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [displayName, setDisplayName] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [activityLogs, setActivityLogs] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Busca dados do Firestore
  useEffect(() => {
    const fetchUserData = async () => {
      if (!currentUser) return;

      setLoadingProfile(true);

      const usersRef = collection(db, "users");
      const emailQuery = query(usersRef, where("email", "==", currentUser.email));
      const snapshot = await getDocs(emailQuery);

      let userDocSnap;
      if (!snapshot.empty) {
        userDocSnap = snapshot.docs[0];
      } else {
        // Não existe — cria novo com dados do Firebase Auth
        const userDocRef = doc(db, "users", currentUser.uid);
        const newUserDoc = {
          name: currentUser.displayName || "Usuário sem nome",
          email: currentUser.email,
          role: "vendedor",
          active: true,
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
        };
        await setDoc(userDocRef, newUserDoc);
        userDocSnap = await getDoc(userDocRef);
      }

      const data = userDocSnap.data();

      setUserData(data);
      setDisplayName(data.name || currentUser.displayName || "");
      setPhotoPreview(currentUser.photoURL || null);
      setLoadingProfile(false);
    };

    fetchUserData();
  }, [currentUser]);

  // Busca últimos logs
  useEffect(() => {
    const fetchLogs = async () => {
      if (!currentUser) return;
      try {
        const logsQuery = query(
          collection(db, "activityLogs"),
          where("userId", "==", currentUser.uid),
          limit(5)
        );
        const logsSnapshot = await getDocs(logsQuery);
        setActivityLogs(logsSnapshot.docs.map((doc) => doc.data()));
      } catch (err) {
        console.error("Erro ao buscar logs de atividade:", err);
      }
    };
    fetchLogs();
  }, [currentUser]);

  const handlePhotoChange = (e) => {
    if (e.target.files[0]) {
      setPhotoFile(e.target.files[0]);
      setPhotoPreview(URL.createObjectURL(e.target.files[0]));
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");
    if (!photoFile && displayName === userData.name) return;

    try {
      let photoURL = currentUser.photoURL;
      let activityMessage = "";

      if (photoFile) {
        const storageRef = ref(
          storage,
          `avatars/${currentUser.uid}/${photoFile.name}`
        );
        const uploadTask = uploadBytesResumable(storageRef, photoFile);
        photoURL = await new Promise((resolve, reject) => {
          uploadTask.on(
            "state_changed",
            (snapshot) =>
              setUploadProgress(
                (snapshot.bytesTransferred / snapshot.totalBytes) * 100
              ),
            (err) => reject(err),
            async () => {
              resolve(await getDownloadURL(uploadTask.snapshot.ref));
            }
          );
        });
        activityMessage = "Atualizou a foto de perfil.";
      }

      if (displayName !== userData.name) {
        activityMessage = `Atualizou o nome para '${displayName}'.`;
      }

      await updateProfile(currentUser, { displayName, photoURL });
      const usersRef = collection(db, "users");
      const emailQuery = query(usersRef, where("email", "==", currentUser.email));
      const snapshot = await getDocs(emailQuery);

      if (!snapshot.empty) {
        await updateDoc(snapshot.docs[0].ref, {
          name: displayName,
          photoURL,
        });
      }

      await logActivity(currentUser.uid, activityMessage);
      setMessage("Perfil atualizado com sucesso!");
      setUploadProgress(0);
    } catch (err) {
      setError("Não foi possível atualizar o perfil.");
      console.error(err);
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");
    if (newPassword !== confirmPassword)
      return setError("As novas senhas não coincidem.");
    if (newPassword.length < 6)
      return setError("A nova senha deve ter no mínimo 6 caracteres.");
    try {
      const credential = EmailAuthProvider.credential(
        currentUser.email,
        currentPassword
      );
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, newPassword);
      await logActivity(currentUser.uid, "Alterou a senha.");
      setMessage("Senha alterada com sucesso!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(
        err.code === "auth/wrong-password"
          ? "A senha atual está incorreta."
          : "Ocorreu um erro ao alterar a senha."
      );
      console.error(err);
    }
  };

  if (loadingProfile) {
    return <p>Carregando perfil...</p>;
  }

  return (
    <>
      <div className="profile-grid">
        <div className="form-container">
          <div className="profile-header">
            <div className="avatar-container">
              {photoPreview ? (
                <img
                  src={photoPreview}
                  alt="Preview do perfil"
                  className="profile-avatar-large"
                />
              ) : (
                <div className="default-avatar-large">
                  <FiUser size={50} />
                </div>
              )}
              <label htmlFor="photo-upload" className="avatar-upload-label">
                <FiCamera />
              </label>
              <input
                id="photo-upload"
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
              />
            </div>
            <div className="profile-info">
              <h2 className="profile-main-name">
                {userData?.name || currentUser.displayName || "Usuário"}
              </h2>
              <span className="profile-role-badge">
                {userData?.role || "Sem cargo"}
              </span>
            </div>
          </div>

          <form onSubmit={handleProfileUpdate}>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                value={currentUser?.email || ""}
                disabled
              />
            </div>

            <div className="form-group">
              <label htmlFor="displayName">Nome Completo</label>
              <input
                type="text"
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="form-button">
                Salvar Alterações
              </button>
            </div>
          </form>

          <div className="settings-section">
            <h3>Alterar Senha</h3>
            <form onSubmit={handlePasswordUpdate}>
              <div className="form-group">
                <label htmlFor="currentPassword">Senha Atual</label>
                <input
                  type="password"
                  id="currentPassword"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="newPassword">Nova Senha</label>
                <input
                  type="password"
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="confirmPassword">Confirmar Nova Senha</label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
              <div className="form-actions">
                <button type="submit" className="form-button secondary">
                  Alterar Senha
                </button>
              </div>
            </form>
          </div>

          {message && <p className="success-message">{message}</p>}
          {error && <p className="error-message">{error}</p>}
        </div>

        <div className="form-container">
          <h3>Últimas Atividades</h3>
          <div className="activity-log-section">
            {activityLogs.length > 0 ? (
              <ul className="activity-log-list">
                {activityLogs.map((log, index) => (
                  <li key={index} className="log-item">
                    <p>{log.action}</p>
                    <span>
                      {log.timestamp?.toDate().toLocaleString("pt-BR")}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p>Nenhuma atividade recente.</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default PerfilPage;