
## תיקון כפתורי עריכה ומחיקה - הוספת דיאלוגים חסרים

### הבעיה
הקוד מכיל:
1. **States לעריכה** (שורות 92-95): `editingTitle`, `editingQuestion`, `editingAnswer`
2. **States למחיקה** (שורות 98-100): `deletingTitle`, `deletingQuestion`, `deletingAnswer`
3. **כפתורים** שמעדכנים את ה-states (שורות 464-481, 634-658, 720-744)

**אבל חסרים לגמרי:**
- `Dialog` קומפוננטות להצגת טופס עריכה
- `AlertDialog` קומפוננטות לאישור מחיקה

### הפתרון

הוספת 6 דיאלוגים לפני סגירת ה-fragment (`</>`) בשורה 549:

**1. דיאלוג עריכת כותרת:**
```jsx
<Dialog open={!!editingTitle} onOpenChange={(open) => !open && setEditingTitle(null)}>
  <DialogContent dir="rtl">
    <DialogHeader>
      <DialogTitle>עריכת כותרת</DialogTitle>
    </DialogHeader>
    <div className="py-4">
      <Label>כותרת</Label>
      <Input 
        value={editingTitle?.title || ""} 
        onChange={(e) => setEditingTitle(prev => prev ? {...prev, title: e.target.value} : null)}
      />
    </div>
    <DialogFooter>
      <Button variant="outline" onClick={() => setEditingTitle(null)}>ביטול</Button>
      <Button onClick={() => {
        if (editingTitle) {
          updateTitle(editingTitle.id, editingTitle.title);
          setEditingTitle(null);
        }
      }}>שמור</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**2. דיאלוג עריכת שאלה:**
```jsx
<Dialog open={!!editingQuestion} onOpenChange={(open) => !open && setEditingQuestion(null)}>
  <DialogContent dir="rtl">
    <DialogHeader>
      <DialogTitle>עריכת שאלה</DialogTitle>
    </DialogHeader>
    <div className="py-4">
      <Label>שאלה</Label>
      <Textarea 
        value={editingQuestion?.text || ""} 
        onChange={(e) => setEditingQuestion(prev => prev ? {...prev, text: e.target.value} : null)}
      />
    </div>
    <DialogFooter>
      <Button variant="outline" onClick={() => setEditingQuestion(null)}>ביטול</Button>
      <Button onClick={() => {
        if (editingQuestion) {
          updateQuestion(editingQuestion.id, editingQuestion.text);
          setEditingQuestion(null);
        }
      }}>שמור</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**3. דיאלוג עריכת תשובה:**
```jsx
<Dialog open={!!editingAnswer} onOpenChange={(open) => !open && setEditingAnswer(null)}>
  <DialogContent dir="rtl">
    <DialogHeader>
      <DialogTitle>עריכת תשובה</DialogTitle>
    </DialogHeader>
    <div className="py-4 space-y-4">
      <div>
        <Label>שם המפרש</Label>
        <Input 
          value={editingAnswer?.mefaresh || ""} 
          onChange={(e) => setEditingAnswer(prev => prev ? {...prev, mefaresh: e.target.value} : null)}
        />
      </div>
      <div>
        <Label>תשובה</Label>
        <Textarea 
          value={editingAnswer?.text || ""} 
          onChange={(e) => setEditingAnswer(prev => prev ? {...prev, text: e.target.value} : null)}
        />
      </div>
    </div>
    <DialogFooter>
      <Button variant="outline" onClick={() => setEditingAnswer(null)}>ביטול</Button>
      <Button onClick={() => {
        if (editingAnswer) {
          updateAnswer(editingAnswer.id, editingAnswer.text, editingAnswer.mefaresh);
          setEditingAnswer(null);
        }
      }}>שמור</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**4. AlertDialog לאישור מחיקת כותרת:**
```jsx
<AlertDialog open={!!deletingTitle} onOpenChange={(open) => !open && setDeletingTitle(null)}>
  <AlertDialogContent dir="rtl">
    <AlertDialogHeader>
      <AlertDialogTitle>האם למחוק את הכותרת?</AlertDialogTitle>
      <AlertDialogDescription>
        פעולה זו לא ניתנת לביטול. כל השאלות והתשובות תחת כותרת זו יימחקו.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>ביטול</AlertDialogCancel>
      <AlertDialogAction onClick={() => {
        if (deletingTitle) {
          deleteTitle(deletingTitle);
          setDeletingTitle(null);
        }
      }}>מחק</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

**5. AlertDialog לאישור מחיקת שאלה:**
```jsx
<AlertDialog open={!!deletingQuestion} onOpenChange={(open) => !open && setDeletingQuestion(null)}>
  <AlertDialogContent dir="rtl">
    <AlertDialogHeader>
      <AlertDialogTitle>האם למחוק את השאלה?</AlertDialogTitle>
      <AlertDialogDescription>
        פעולה זו לא ניתנת לביטול. כל התשובות לשאלה זו יימחקו.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>ביטול</AlertDialogCancel>
      <AlertDialogAction onClick={() => {
        if (deletingQuestion) {
          deleteQuestion(deletingQuestion);
          setDeletingQuestion(null);
        }
      }}>מחק</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

**6. AlertDialog לאישור מחיקת תשובה:**
```jsx
<AlertDialog open={!!deletingAnswer} onOpenChange={(open) => !open && setDeletingAnswer(null)}>
  <AlertDialogContent dir="rtl">
    <AlertDialogHeader>
      <AlertDialogTitle>האם למחוק את התשובה?</AlertDialogTitle>
      <AlertDialogDescription>
        פעולה זו לא ניתנת לביטול.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>ביטול</AlertDialogCancel>
      <AlertDialogAction onClick={() => {
        if (deletingAnswer) {
          deleteAnswer(deletingAnswer);
          setDeletingAnswer(null);
        }
      }}>מחק</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

### מיקום הקוד
כל 6 הדיאלוגים יתווספו בין שורות 548-549, לפני סגירת ה-`</>` fragment.

### סיכום השינויים
| קובץ | שינוי |
|------|-------|
| `src/components/PasukDisplay.tsx` | הוספת 3 Dialog לעריכה + 3 AlertDialog לאישור מחיקה |
