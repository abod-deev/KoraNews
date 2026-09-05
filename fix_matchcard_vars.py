with open('src/components/predictions/PredictionMatchCard.tsx', 'r') as f:
    text = f.read()

import re

# We need to find the `return (` that is broken.
# The broken part looks like:
"""
        return prev - 1;
      });
    }, 1000);

    return (
    <motion.div
"""

# Let's replace the broken useEffect and add the missing variables.
broken_part = """    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return ("""

fixed_part = """    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [userPred]);

  const isCalculated = m.status === 'FINISHED' && predictionMatch.pointsPerMatch !== undefined;
  const isFinished = m.status === 'FINISHED';
  const isLive = m.status === 'LIVE';
  const isOpen = m.status === 'PENDING' && isContestActive && (userPred ? userPred.canEdit !== false : true);
  
  const formattedDate = new Date(m.matchDate).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' }) + ' • ' + new Date(m.matchDate).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true });

  const handleScoreChange = (team, val) => {
    if (val === '') {
      if (team === 'home') setHomeScore('');
      else setAwayScore('');
      return;
    }
    const v = parseInt(val);
    if (isNaN(v)) return;
    if (v < 0 || v > 99) return;
    if (team === 'home') setHomeScore(v);
    else setAwayScore(v);
  };

  const handleSave = async () => {
    if (homeScore === '' || awayScore === '') return;
    setIsSubmitting(true);
    try {
      await onSavePrediction(m.id, homeScore, awayScore);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 3000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShareResult = () => {
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2000);
    if (navigator.share) {
      navigator.share({
        title: 'توقعي لمباراة ' + m.homeTeam.name + ' ضد ' + m.awayTeam.name,
        text: 'توقعت نتيجة المباراة ' + homeScore + ' - ' + awayScore + ' على كورانيوز!',
        url: window.location.href,
      }).catch(() => {});
    }
  };

  return ("""

if broken_part in text:
    text = text.replace(broken_part, fixed_part)
    with open('src/components/predictions/PredictionMatchCard.tsx', 'w') as f:
        f.write(text)
    print("Fixed!")
else:
    print("Broken part not found!")
